import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as run from "@/lib/warehouse/run";
import { SUPPLIER_NAME } from "@/lib/warehouse/supplier";

/**
 * Running a facility, over the wire.
 *
 * Nothing but transport: authenticate, validate what came in, and hand it to
 * the module that does the work. The work itself lives in lib/warehouse/run so
 * that the whole mode can be played through in a test against an in-memory
 * database - a bug in the week close should be found by a test rather than by
 * a learner halfway through week nine.
 *
 * Every one of these passes the caller's own Supabase client rather than the
 * service role, so row-level security is what keeps one learner's pharmacy out
 * of another's: the policies do the work, not a filter written by hand that
 * could be forgotten on the one query that mattered.
 */

const zone = z.enum(["ambient", "cold-chain", "cd-safe", "flammables", "quarantine"]);

export const createFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    name: z.string().min(1).max(60).default("My Pharmacy"),
    city: z.string().min(1).max(40).default("Karachi"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  }))
  .handler(({ data, context }) =>
    run.createFacility(context.supabase, context.userId, data));

export const getFacilityState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) =>
    run.getFacilityState(context.supabase, context.userId));

export const applyForLicence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ kind: z.enum(["drug_sale", "narcotics"]) }))
  .handler(({ data, context }) =>
    run.applyForLicence(context.supabase, context.userId, data));

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    supplier: z.string().min(1).max(60).default(SUPPLIER_NAME),
    lines: z.array(z.object({
      drugId: z.string().uuid(),
      packs: z.number().int().min(1).max(5000),
    })).min(1).max(40),
  }))
  .handler(({ data, context }) =>
    run.placeOrder(context.supabase, context.userId, data));

export const putAwayStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    moves: z.array(z.object({
      stockId: z.string().uuid(),
      zone,
    })).min(1).max(200),
    /** Set once the learner has seen the warning and meant it anyway. */
    confirm: z.boolean().default(false),
  }))
  .handler(({ data, context }) =>
    run.putAwayStock(context.supabase, context.userId, data));

export const signCdRegister = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    counts: z.array(z.object({
      drugId: z.string().uuid(),
      counted: z.number().int().min(0).max(100000),
    })).max(60),
  }))
  .handler(({ data, context }) =>
    run.signCdRegister(context.supabase, context.userId, data));

export const logTemperature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) =>
    run.logTemperature(context.supabase, context.userId));

export const resolveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    eventId: z.string().uuid(),
    action: z.enum(["quarantine", "use", "destroy", "acknowledge"]),
  }))
  .handler(({ data, context }) =>
    run.resolveEvent(context.supabase, context.userId, data));

export const advanceWeek = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(({ context }) =>
    run.advanceWeek(context.supabase, context.userId));
