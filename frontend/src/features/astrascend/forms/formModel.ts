import { SubmissionError } from '../submission/requestIntegration';
import type {
    DetailsByService,
    DetailsDraft,
    FieldErrors,
    Requester,
    RequesterType,
    Service,
    ServiceRequest,
} from './types';
import {
    emailError,
    fieldFormatError,
    isValidDate,
} from './fieldValidation';

export interface Option {
    value: string;
    label: string;
}
export interface FieldDefinition {
    name: string;
    label: string;
    kind?:
        | 'text'
        | 'email'
        | 'url'
        | 'date'
        | 'number'
        | 'textarea'
        | 'select';
    maxLength?: number;
    placeholder?: string;
    required?: boolean;
    options?: readonly Option[];
    fullWidth?: boolean;
}

export interface ContactDraft {
    fullName: string;
    email: string;
    organization: string;
    type: RequesterType;
}
export const requesterOptions: readonly Option[] = [
    { value: 'student', label: 'Student' },
    { value: 'astra_member', label: 'ASTRA member' },
    {
        value: 'campus_organization',
        label: 'Campus organization representative',
    },
    { value: 'college', label: 'College representative' },
    { value: 'community_group', label: 'Community group representative' },
    { value: 'external_partner', label: 'Industry / external partner' },
    { value: 'other', label: 'Other' },
];

export function validateContact(
    contact: ContactDraft,
    consent: boolean,
): FieldErrors {
    const errors: FieldErrors = {};
    if (!contact.fullName.trim())
        errors['requester.fullName'] = 'Enter your full name.';
    else {
        const formatError = fieldFormatError('fullName', 'text', contact.fullName);
        if (formatError) errors['requester.fullName'] = formatError;
    }
    const invalidEmail = emailError(contact.email);
    if (invalidEmail) errors['requester.email'] = invalidEmail;
    if (!requesterOptions.some((option) => option.value === contact.type))
        errors['requester.type'] =
            'Choose how you are connected to this request.';
    if (!consent) errors.consent = 'Confirm the statement before submitting.';
    return errors;
}

export function toRequester(contact: ContactDraft): Requester {
    return {
        fullName: contact.fullName.trim(),
        email: contact.email.trim(),
        type: contact.type,
        ...(contact.organization.trim()
            ? { organization: contact.organization.trim() }
            : {}),
    };
}

export interface ServiceDefinition<S extends Service = Service> {
    service: S;
    heading: string;
    fields: readonly FieldDefinition[];
    visibleFields: (draft: DetailsDraft<S>) => readonly FieldDefinition[];
    validate: (draft: DetailsDraft<S>) => FieldErrors;
    buildRequest: (
        contact: ContactDraft,
        consent: boolean,
        draft: DetailsDraft<S>,
    ) => Extract<ServiceRequest, { service: S }>;
}

export function defineService<S extends Service>(
    service: S,
    heading: string,
    fields: readonly (FieldDefinition & {
        name: keyof DetailsByService[S] & string;
    })[],
    visibleNames?: (draft: DetailsDraft<S>) => readonly string[],
): ServiceDefinition<S> {
    const visibleFields = (draft: DetailsDraft<S>) => {
        const visible = visibleNames?.(draft);
        return fields.filter(
            (field) => !visible || visible.includes(field.name),
        );
    };
    const validate = (draft: DetailsDraft<S>): FieldErrors => {
        const errors: FieldErrors = {};
        for (const field of visibleFields(draft)) {
            const value = String(draft[field.name] ?? '').trim();
            const key = `details.${field.name}`;
            if (field.required && !value)
                errors[key] = `Complete “${field.label}”.`;
            if (!value) continue;
            const formatError = fieldFormatError(
                field.name,
                field.kind,
                value,
            );
            if (formatError) errors[key] = formatError;
            if (
                field.options &&
                !field.options.some((option) => option.value === value)
            )
                errors[key] = 'Choose an option from the list.';
            if (field.kind === 'url') {
                try {
                    const url = new URL(value);
                    if (
                        !['https:', 'http:'].includes(url.protocol) ||
                        !url.hostname
                    )
                        throw new Error();
                } catch {
                    errors[key] = 'Enter a complete http:// or https:// link.';
                }
            }
            if (field.kind === 'date') {
                if (!isValidDate(value)) {
                    errors[key] = 'Enter a valid calendar date.';
                }
            }
        }
        return errors;
    };
    return {
        service,
        heading,
        fields,
        visibleFields,
        validate,
        buildRequest(contact, consent, draft) {
            const errors = {
                ...validateContact(contact, consent),
                ...validate(draft),
            };
            if (Object.keys(errors).length)
                throw new SubmissionError(
                    'Please check the highlighted fields.',
                    'validation',
                    errors,
                );
            const details = Object.fromEntries(
                visibleFields(draft)
                    .map((field) => [
                        field.name,
                        String(draft[field.name] ?? '').trim(),
                    ])
                    .filter(([, value]) => value),
            );
            // The selected definition validates required fields/options and projects
            // only its visible keys before crossing the typed integration boundary.
            return {
                service,
                requester: toRequester(contact),
                consent: true,
                details,
            } as Extract<ServiceRequest, { service: S }>;
        },
    };
}
