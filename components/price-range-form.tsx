"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const priceSchema = z
  .object({
    min: z
      .string()
      .refine(
        (v) =>
          v === "" ||
          (/^\d+(?:\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v))),
        "Enter a valid non-negative amount (up to 2 decimals)",
      ),
    max: z
      .string()
      .refine(
        (v) =>
          v === "" ||
          (/^\d+(?:\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v))),
        "Enter a valid non-negative amount (up to 2 decimals)",
      ),
  })
  .refine((v) => !v.min || !v.max || Number(v.min) <= Number(v.max), {
    path: ["max"],
    message: "Maximum must be at least the minimum",
  });

type PriceValues = z.infer<typeof priceSchema>;

export function PriceRangeForm({
  min,
  max,
  currency,
  onApply,
}: {
  min: string;
  max: string;
  currency: string;
  onApply: (values: PriceValues) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PriceValues>({
    resolver: zodResolver(priceSchema),
    defaultValues: { min, max },
    mode: "onChange",
  });
  useEffect(() => {
    reset({ min, max });
  }, [min, max, reset]);
  return (
    <form
      onSubmit={handleSubmit(onApply)}
      className="mt-2 space-y-2"
      noValidate
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input
            aria-label="Minimum price"
            type="text"
            inputMode="decimal"
            placeholder="Min"
            disabled={!currency}
            aria-invalid={!!errors.min}
            {...register("min")}
          />
          {errors.min && (
            <p role="alert" className="text-xs text-red-700 mt-1">
              {errors.min.message}
            </p>
          )}
        </div>
        <div>
          <Input
            aria-label="Maximum price"
            type="text"
            inputMode="decimal"
            placeholder="Max"
            disabled={!currency}
            aria-invalid={!!errors.max}
            {...register("max")}
          />
          {errors.max && (
            <p role="alert" className="text-xs text-red-700 mt-1">
              {errors.max.message}
            </p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={!currency || !isDirty} className="w-full">
        Apply price range
      </Button>
    </form>
  );
}
