import { useId, useState } from 'react';
import type { FieldDefinition } from '../formModel';
import { fieldError, input } from '../../styles/styles';
import { SelectField } from './SelectField';
import { DatePicker } from './DatePicker';
import {
    emailError,
    isValidDate,
    maxLengthForField,
    sanitizeFieldValue,
} from '../fieldValidation';

interface Props {
    field: FieldDefinition;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    disabled?: boolean;
}

export function FieldInput({ field, value, onChange, error, disabled }: Props) {
    const id = useId();
    const errorId = `${id}-error`;
    const labelId = `${id}-label`;
    const [touched, setTouched] = useState(false);
    const clientError =
        field.kind === 'email'
            ? value.trim() || field.required
                ? emailError(value)
                : undefined
            : field.kind === 'date' && value && !isValidDate(value)
              ? 'Enter a valid date as YYYY-MM-DD.'
              : undefined;
    const visibleError = error || (touched ? clientError : undefined);
    const change = (next: string) => {
        if (error) setTouched(true);
        onChange(sanitizeFieldValue(field.name, field.kind, next));
    };
    const common = {
        id,
        name: field.name,
        value,
        disabled,
        required: field.required,
        maxLength: field.maxLength ?? maxLengthForField(field.name, field.kind),
        inputMode: field.kind === 'number' ? ('numeric' as const) : undefined,
        'aria-invalid': visibleError ? (true as const) : undefined,
        'aria-describedby': visibleError ? errorId : undefined,
        onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
        ) => change(event.target.value),
        onBlur: () => setTouched(true),
    };
    const picker = {
        id,
        name: field.name,
        label: field.label,
        labelId,
        value,
        disabled,
        required: field.required,
        invalid: Boolean(visibleError),
        describedBy: visibleError ? errorId : undefined,
        onChange: change,
        onBlur: () => setTouched(true),
    };
    return (
        <div className={`min-w-0${field.fullWidth ? ' col-span-full' : ''}`}>
            <label
                id={labelId}
                className="mb-2 block text-[14px] font-semibold"
                htmlFor={id}
            >
                {field.label}
                {field.required && <span aria-hidden="true"> *</span>}
            </label>
            {field.kind === 'select' ? (
                <SelectField
                    {...picker}
                    options={field.options || []}
                    placeholder={field.placeholder}
                />
            ) : field.kind === 'date' ? (
                <DatePicker {...picker} />
            ) : field.kind === 'textarea' ? (
                <textarea
                    {...common}
                    className={`${input} min-h-[74px] resize-y`}
                    placeholder={field.placeholder}
                    rows={3}
                />
            ) : (
                <input
                    {...common}
                    className={`${input} min-h-[50px]`}
                    type={field.kind === 'number' ? 'text' : field.kind || 'text'}
                    placeholder={field.placeholder}
                    autoComplete={
                        field.kind === 'email'
                            ? 'email'
                            : field.name === 'fullName'
                              ? 'name'
                              : undefined
                    }
                />
            )}
            {visibleError && (
                <p className={fieldError} id={errorId}>
                    {visibleError}
                </p>
            )}
        </div>
    );
}
