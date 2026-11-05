import { FieldInput } from './controls/FieldInput';
import type { ServiceDefinition } from './formModel';
import type { DetailsDraft, FieldErrors, Service } from './types';
import { guidance } from '../styles/styles';

export function ServiceFields<S extends Service>({
    definition,
    draft,
    onChange,
    errors = {},
    disabled,
}: {
    definition: ServiceDefinition<S>;
    draft: DetailsDraft<S>;
    onChange: (field: string, value: string) => void;
    errors?: FieldErrors;
    disabled?: boolean;
}) {
    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {definition.visibleFields(draft).map((field) => (
                    <FieldInput
                        key={field.name}
                        field={field}
                        value={String(
                            (draft as Record<string, string>)[field.name] ?? '',
                        )}
                        onChange={(value) => onChange(field.name, value)}
                        error={errors[`details.${field.name}`]}
                        disabled={disabled}
                    />
                ))}
            </div>
            {definition.service === 'reign' && (
                <p className={guidance} aria-live="polite">
                    Fields adapt to your first answer, so you only see questions
                    that apply.
                </p>
            )}
        </>
    );
}
