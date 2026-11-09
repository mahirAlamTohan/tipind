import { useMemo, useState, type ChangeEvent, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

import { Card } from "@/components/ui/card"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"

import { useCheckoutStore } from "../checkout-store"
import {
  FORM_ID,
  MAX_NOTES_LENGTH,
  PAYMENT_METHODS,
  REGION_REQUIRED,
} from "../constants"
import { checkoutContent } from "../content"
import { hasPostalSystem } from "../lib/address"
import {
  COUNTRIES,
  findCountry,
  postalLabel,
  regionLabel,
} from "../lib/countries"
import { fieldValue } from "../lib/details"
import { errorText, validateDetails } from "../lib/validation"
import type { FieldName } from "../types"
import { controlClass, FormField } from "./form-field"

type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

const COUNTRY_OPTIONS: readonly ComboboxOption[] = COUNTRIES.map((country) => ({
  label: country.name,
  value: country.code,
}))

const PAYMENT_OPTIONS: readonly ComboboxOption[] = [
  { label: checkoutContent.details.paymentNone, value: "" },
  ...PAYMENT_METHODS.map((method) => ({
    label: method.label,
    value: method.id,
  })),
]

function Section({
  children,
  heading,
  index,
}: {
  children: ReactNode
  heading: string
  index: number
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      transition={{ delay: index * 0.07, duration: 0.35 }}
    >
      <Card className="gap-4 p-5 sm:p-6">
        <h3 className="m-0 font-display text-base font-extrabold text-ink">
          {heading}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </Card>
    </motion.div>
  )
}

export function DetailsForm({ onValid }: { onValid: () => void }) {
  const copy = checkoutContent
  const details = useCheckoutStore((state) => state.details)
  const { clearDetails, setCountry, setField } = useCheckoutStore(
    (state) => state.actions
  )
  const [touched, setTouched] = useState<ReadonlySet<FieldName>>(
    () => new Set()
  )
  const [attempted, setAttempted] = useState(false)

  const errors = useMemo(() => validateDetails(details), [details])
  const country = findCountry(details.country)
  const regionOptions = useMemo<readonly ComboboxOption[]>(
    () =>
      (country?.regions ?? []).map((region) => ({
        label: region.name,
        value: region.name,
      })),
    [country]
  )
  const hasRegionList = regionOptions.length > 0

  function errorFor(name: FieldName) {
    const kind = errors.get(name)
    return kind && (attempted || touched.has(name))
      ? errorText(kind, details)
      : undefined
  }

  function markTouched(name: FieldName) {
    setTouched((current) => new Set(current).add(name))
  }

  /** Props for plain inputs. */
  function bind(name: FieldName) {
    const error = errorFor(name)
    return {
      "aria-describedby": error ? `checkout-${name}-error` : undefined,
      "aria-invalid": error ? true : undefined,
      id: `checkout-${name}`,
      name,
      onBlur: () => {
        markTouched(name)
      },
      onChange: (event: ControlEvent) => {
        setField(name, event.target.value)
      },
      value: fieldValue(details, name),
    }
  }

  /** Props for comboboxes. */
  function combo(name: FieldName) {
    const error = errorFor(name)
    return {
      describedBy: error ? `checkout-${name}-error` : undefined,
      emptyText: copy.details.noResults,
      id: `checkout-${name}`,
      inputClassName: controlClass,
      invalid: Boolean(error),
      onBlur: () => {
        markTouched(name)
      },
      triggerLabel: copy.details.showOptionsLabel,
      value: fieldValue(details, name),
    }
  }

  function onSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    setAttempted(true)

    if (errors.size === 0) {
      onValid()
      return
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    })
  }

  return (
    <form className="space-y-4" id={FORM_ID} noValidate onSubmit={onSubmit}>
      <div>
        <h2 className="m-0 font-display text-xl font-extrabold tracking-tight text-ink">
          {copy.details.heading}
        </h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          {copy.details.description}
        </p>
      </div>

      <Section heading={copy.details.contactHeading} index={0}>
        <FormField
          error={errorFor("firstName")}
          label={copy.fields.firstName.label}
          name="firstName"
        >
          <input
            {...bind("firstName")}
            autoComplete="given-name"
            className={controlClass}
            maxLength={100}
            placeholder={copy.fields.firstName.placeholder}
          />
        </FormField>
        <FormField
          error={errorFor("lastName")}
          label={copy.fields.lastName.label}
          name="lastName"
        >
          <input
            {...bind("lastName")}
            autoComplete="family-name"
            className={controlClass}
            maxLength={100}
            placeholder={copy.fields.lastName.placeholder}
          />
        </FormField>
        <FormField
          error={errorFor("email")}
          label={copy.fields.email.label}
          name="email"
        >
          <input
            {...bind("email")}
            autoComplete="email"
            className={controlClass}
            inputMode="email"
            maxLength={200}
            placeholder={copy.fields.email.placeholder}
            type="email"
          />
        </FormField>
        <FormField label={copy.fields.company.label} name="company" optional>
          <input
            {...bind("company")}
            autoComplete="organization"
            className={controlClass}
            maxLength={150}
            placeholder={copy.fields.company.placeholder}
          />
        </FormField>
      </Section>

      <Section heading={copy.details.addressHeading} index={1}>
        <div className="sm:col-span-2">
          <FormField
            error={errorFor("country")}
            label={copy.fields.country.label}
            name="country"
          >
            <Combobox
              {...combo("country")}
              items={COUNTRY_OPTIONS}
              onValueChange={setCountry}
              placeholder={copy.fields.country.placeholder}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField
            error={errorFor("addressLine1")}
            label={copy.fields.addressLine1.label}
            name="addressLine1"
          >
            <input
              {...bind("addressLine1")}
              autoComplete="address-line1"
              className={controlClass}
              maxLength={200}
              placeholder={copy.fields.addressLine1.placeholder}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField
            label={copy.fields.addressLine2.label}
            name="addressLine2"
            optional
          >
            <input
              {...bind("addressLine2")}
              autoComplete="address-line2"
              className={controlClass}
              maxLength={200}
              placeholder={copy.fields.addressLine2.placeholder}
            />
          </FormField>
        </div>
        <FormField
          error={errorFor("city")}
          label={copy.fields.city.label}
          name="city"
        >
          <input
            {...bind("city")}
            autoComplete="address-level2"
            className={controlClass}
            maxLength={100}
            placeholder={copy.fields.city.placeholder}
          />
        </FormField>
        <FormField
          error={errorFor("region")}
          label={country ? regionLabel(country.code) : copy.fields.region.label}
          name="region"
          optional={country ? !REGION_REQUIRED.has(country.code) : false}
        >
          {hasRegionList ? (
            <Combobox
              {...combo("region")}
              items={regionOptions}
              onValueChange={(value) => {
                setField("region", value)
              }}
              placeholder={copy.fields.region.placeholder}
            />
          ) : (
            <input
              {...bind("region")}
              autoComplete="address-level1"
              className={controlClass}
              maxLength={100}
              placeholder={copy.fields.region.placeholder}
            />
          )}
        </FormField>
        <FormField
          error={errorFor("postalCode")}
          label={
            country ? postalLabel(country.code) : copy.fields.postalCode.label
          }
          name="postalCode"
          optional={country ? !hasPostalSystem(country.code) : false}
        >
          <input
            {...bind("postalCode")}
            autoComplete="postal-code"
            className={controlClass}
            maxLength={16}
            placeholder={copy.fields.postalCode.placeholder}
          />
        </FormField>
      </Section>

      <Section heading={copy.details.extraHeading} index={2}>
        <div className="sm:col-span-2">
          <FormField
            label={copy.fields.paymentMethod.label}
            name="paymentMethod"
            optional
          >
            <Combobox
              {...combo("paymentMethod")}
              items={PAYMENT_OPTIONS}
              onValueChange={(value) => {
                setField("paymentMethod", value)
              }}
              placeholder={copy.fields.paymentMethod.placeholder}
            />
          </FormField>
        </div>
        <div className="sm:col-span-2">
          <FormField label={copy.fields.notes.label} name="notes" optional>
            <textarea
              {...bind("notes")}
              className={`${controlClass} h-auto min-h-24 resize-y py-3`}
              maxLength={MAX_NOTES_LENGTH}
              placeholder={copy.fields.notes.placeholder}
              rows={3}
            />
          </FormField>
        </div>
      </Section>

      <p className="m-0 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{copy.details.savedNotice}</span>
        <button
          className="font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => {
            clearDetails()
            setTouched(new Set())
            setAttempted(false)
          }}
          type="button"
        >
          {copy.details.clearSaved}
        </button>
      </p>
    </form>
  )
}
