import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { ContactFields, ConsentField } from '../forms/controls/CommonFields';
import { ServiceFields } from '../forms/ServiceFields';
import { SubmissionReceiptView } from '../components/SubmissionReceiptView';
import { useRequestState } from '../forms/RequestState';
import {
  normalizeSubmissionError,
  submitServiceRequest,
} from '../submission/requestIntegration';
import { definitions, serviceCards } from '../forms/services';
import {
  isService,
  type FieldErrors,
  type Service,
  type ServiceRequest,
} from '../forms/types';
import {
  button,
  contactGrid,
  container,
  formLegend,
  formSection,
  heading,
  panel,
} from '../styles/styles';

export function RequestPage() {
  const state = useRequestState();
  const [params, setParams] = useSearchParams();
  const selected = params.get('service');
  const service: Service = isService(selected) ? selected : 'makeform';
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const form = useRef<HTMLFormElement>(null);
  const focusErrors = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setErrors({});
    setMessage('');
  }, [service]);
  useEffect(() => {
    if (focusErrors.current) {
      focusErrors.current = false;
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    }
  }, [errors]);
  const clearErrors = (paths: string[]) => {
    setErrors((current) => {
      if (!paths.some((path) => path in current)) return current;
      const next = { ...current };
      paths.forEach((path) => delete next[path]);
      return next;
    });
    setMessage('');
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setMessage('');
    setErrors({});
    try {
      let request: ServiceRequest;
      // Keep each category paired with its typed draft at the submission boundary.
      switch (service) {
        case 'makeform':
          request = definitions.makeform.buildRequest(
            state.contact,
            state.consent,
            state.drafts.makeform
          );
          break;
        case 'upshift':
          request = definitions.upshift.buildRequest(
            state.contact,
            state.consent,
            state.drafts.upshift
          );
          break;
        case 'linkup':
          request = definitions.linkup.buildRequest(
            state.contact,
            state.consent,
            state.drafts.linkup
          );
          break;
        case 'reign':
          request = definitions.reign.buildRequest(
            state.contact,
            state.consent,
            state.drafts.reign
          );
          break;
      }
      setPending(true);
      const receipt = await submitServiceRequest(request);
      if (mounted.current) {
        state.setReceipt(receipt);
      }
    } catch (error) {
      if (mounted.current) {
        const failure = normalizeSubmissionError(error);
        focusErrors.current = Object.keys(failure.fieldErrors).length > 0;
        setErrors(failure.fieldErrors);
        setMessage(failure.message);
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  };
  const fieldProps = {
    errors,
    disabled: pending,
    onChange: (field: string, value: string) => {
      state.updateDetail(service, field, value);
      clearErrors([`details.${field}`]);
    },
  };
  return (
    <div className="bg-ascend-form pb-16 pt-10 as-compact:pb-[43px] as-compact:pt-[29px]">
      <div className={container}>
        <div className="mb-10 md:mb-16 as-compact:mb-[29px]">
          <h1
            className={`${heading} my-3 text-[clamp(34px,4vw,48px)] as-compact:text-[clamp(32px,2.7vw,36px)]`}
          >
            Tell us what you have in mind.
          </h1>
          <p className="text-[18px] font-medium text-ascend-muted as-compact:text-[16px]">
            Choose a service and tell us what you need.
          </p>
        </div>
        <form
          className={`${panel} flex flex-col gap-6 px-4 py-6 sm:p-6 md:p-8 as-compact:p-[22px]`}
          ref={form}
          onSubmit={submit}
          noValidate
          aria-busy={pending}
        >
          {message && (
            <p
              className="rounded-xl border border-ascend-error p-4 text-ascend-error"
              role="alert"
            >
              {message}
            </p>
          )}
          <fieldset className={formSection} disabled={pending}>
            <legend className={formLegend}>
              <span className="text-[13px] text-ascend-accent">01</span> Find
              your direction
            </legend>
            <div className={contactGrid}>
              {serviceCards.map((card) => (
                <label
                  key={card.service}
                  className={`relative flex min-h-[132px] min-w-0 cursor-pointer flex-col gap-2 rounded-2xl has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-ascend-accent has-[:focus-visible]:outline-offset-4 sm:min-h-[148px] as-compact:min-h-[clamp(104px,14.4vh,116px)] as-compact:gap-1.5 ${service === card.service ? 'border-2 border-ascend-blue bg-ascend-selected p-[19px] as-compact:p-[11px]' : 'border border-ascend-line p-5 as-compact:p-3'}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="service"
                    value={card.service}
                    checked={service === card.service}
                    onChange={() =>
                      setParams(
                        { service: card.service },
                        {
                          replace: true,
                          preventScrollReset: true,
                        }
                      )
                    }
                  />
                  <span className="pr-[72px] text-[12px] font-bold text-ascend-accent">
                    {card.name}
                  </span>
                  <strong className="text-[17px] font-semibold as-compact:text-[16px]">
                    {card.title}
                  </strong>
                  <span className="text-[14px] text-ascend-muted">
                    {card.description}
                  </span>
                  {service === card.service && (
                    <span
                      className="absolute right-2.5 top-3 rounded-[999px] bg-ascend-blue px-2 py-1 text-[11px] font-bold text-white"
                      aria-hidden="true"
                    >
                      ✓ Selected
                    </span>
                  )}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className={formSection} disabled={pending}>
            <legend className={formLegend}>
              <span className="text-[13px] text-ascend-accent">02</span>{' '}
              Introduce yourself
            </legend>
            <ContactFields
              value={state.contact}
              onChange={(next) => {
                clearErrors(
                  (['fullName', 'email', 'organization', 'type'] as const)
                    .filter((field) => next[field] !== state.contact[field])
                    .map((field) => `requester.${field}`)
                );
                state.setContact(next);
              }}
              errors={errors}
              disabled={pending}
            />
          </fieldset>
          <fieldset className={formSection} disabled={pending}>
            <legend className={formLegend}>
              <span className="text-[13px] text-ascend-accent">03</span>{' '}
              {definitions[service].heading}
            </legend>
            {service === 'makeform' && (
              <ServiceFields
                definition={definitions.makeform}
                draft={state.drafts.makeform}
                {...fieldProps}
              />
            )}
            {service === 'upshift' && (
              <ServiceFields
                definition={definitions.upshift}
                draft={state.drafts.upshift}
                {...fieldProps}
              />
            )}
            {service === 'linkup' && (
              <ServiceFields
                definition={definitions.linkup}
                draft={state.drafts.linkup}
                {...fieldProps}
              />
            )}
            {service === 'reign' && (
              <ServiceFields
                definition={definitions.reign}
                draft={state.drafts.reign}
                {...fieldProps}
              />
            )}
          </fieldset>
          <fieldset className={formSection} disabled={pending}>
            <legend className={formLegend}>
              <span className="text-[13px] text-ascend-accent">04</span> Review
              & submit
            </legend>
            <ConsentField
              checked={state.consent}
              onChange={state.setConsent}
              error={errors.consent}
              disabled={pending}
            />
            <button className={button()} type="submit" disabled={pending}>
              {pending ? 'Submitting…' : 'Submit my request ↗'}
            </button>
            {pending && (
              <p role="status" className="text-ascend-muted">
                Sending your request…
              </p>
            )}
          </fieldset>
        </form>
        {state.receipt && (
          <SubmissionReceiptView
            receipt={state.receipt}
            modal
            onStartAnother={state.reset}
          />
        )}
      </div>
    </div>
  );
}

export function SuccessPage() {
  const state = useRequestState();
  const navigate = useNavigate();
  if (!state.receipt) return <Navigate to="/astrascend/request" replace />;
  return (
    <SubmissionReceiptView
      receipt={state.receipt}
      onStartAnother={() => {
        state.reset();
        navigate('/astrascend/request');
      }}
    />
  );
}

export function LegacyServiceRedirect() {
  const { serviceId } = useParams();
  const code =
    serviceId?.toLowerCase() === 'ascent' ? 'reign' : serviceId?.toLowerCase();
  return (
    <Navigate
      replace
      to={
        isService(code) ? `/astrascend/request?service=${code}` : '/astrascend'
      }
    />
  );
}
