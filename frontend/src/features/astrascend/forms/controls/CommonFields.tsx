import { useId } from 'react';
import { FieldInput } from './FieldInput';
import {
    requesterOptions,
    type ContactDraft,
    type FieldDefinition,
} from '../formModel';
import type { FieldErrors, RequesterType } from '../types';
import {
    contactGrid,
    disabled as disabledStyle,
    fieldError,
    focus,
    guidance,
} from '../../styles/styles';

export const CONSENT_TEXT =
    'I agree that ASTRA Developers may use these details to assess and coordinate this request and contact me about it. I understand that submission does not guarantee acceptance.';

const contactFields: readonly (FieldDefinition & {
    name: keyof ContactDraft;
})[] = [
    {
        name: 'fullName',
        label: 'Full name',
        required: true,
        placeholder: 'Your full name',
    },
    {
        name: 'email',
        label: 'Email address',
        kind: 'email',
        required: true,
        placeholder: 'you@example.com',
    },
    {
        name: 'organization',
        label: 'Organization / college',
        placeholder: 'If applicable',
    },
    {
        name: 'type',
        label: 'I am a…',
        kind: 'select',
        required: true,
        options: requesterOptions,
    },
];

export function ContactFields({
    value,
    onChange,
    errors = {},
    disabled,
}: {
    value: ContactDraft;
    onChange: (value: ContactDraft) => void;
    errors?: FieldErrors;
    disabled?: boolean;
}) {
    return (
        <div className={contactGrid}>
            {contactFields.map((field) => (
                <FieldInput
                    key={field.name}
                    field={field}
                    value={value[field.name]}
                    disabled={disabled}
                    error={errors[`requester.${field.name}`]}
                    onChange={(next) =>
                        onChange({
                            ...value,
                            [field.name]:
                                field.name === 'type'
                                    ? (next as RequesterType)
                                    : next,
                        })
                    }
                />
            ))}
        </div>
    );
}

export function ConsentField({
    checked,
    onChange,
    error,
    disabled,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    error?: string;
    disabled?: boolean;
}) {
    const id = useId();
    const labelId = `${id}-text`;
    return (
        <div>
            <div className="flex items-start gap-3">
                <input
                    className={`mt-0.5 h-[20px] w-[20px] shrink-0 cursor-pointer rounded border border-ascend-field accent-ascend-blue aria-[invalid=true]:border-ascend-error ${focus} ${disabledStyle}`}
                    id={id}
                    name="consent"
                    type="checkbox"
                    required
                    checked={checked}
                    disabled={disabled}
                    aria-labelledby={labelId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    onChange={(event) => onChange(event.target.checked)}
                />
                <span
                    id={labelId}
                    className="text-[14px] leading-relaxed text-ascend-muted"
                >
                    {CONSENT_TEXT}
                    <span className="whitespace-nowrap font-medium text-ascend-ink" aria-hidden="true">
                        &nbsp;*
                    </span>
                </span>
            </div>
            {error && (
                <p className={fieldError} id={`${id}-error`}>
                    {error}
                </p>
            )}
            <p className={`${guidance} mb-6`}>
                Please avoid sharing passwords, private keys, confidential
                documents, or unnecessary sensitive personal information.
            </p>
        </div>
    );
}
