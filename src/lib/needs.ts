import type {
  CostBreakdown,
  NeedsPrioritySlice,
  PriorityScore,
  SchoolNeeds,
} from "../types";

export const PRIORITY_SCORES: PriorityScore[] = ["1", "2", "3", "4"];

function emptySlice(): NeedsPrioritySlice {
  return { facilities: {}, safety: {}, technology: {}, food: {} };
}

export function emptyPriorityMap(): Record<PriorityScore, NeedsPrioritySlice> {
  return {
    "1": emptySlice(),
    "2": emptySlice(),
    "3": emptySlice(),
    "4": emptySlice(),
  };
}

export function isAllPriorities(selected: readonly string[]): boolean {
  return (
    selected.length === PRIORITY_SCORES.length &&
    PRIORITY_SCORES.every((score) => selected.includes(score))
  );
}

function addBreakdown(target: CostBreakdown, source: CostBreakdown) {
  for (const [key, value] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function sumBreakdown(breakdown: CostBreakdown): number {
  return Object.values(breakdown).reduce((sum, value) => sum + value, 0);
}

export function sliceTotal(slice: NeedsPrioritySlice | undefined): number {
  if (!slice) return 0;
  return (
    sumBreakdown(slice.facilities) +
    sumBreakdown(slice.safety) +
    sumBreakdown(slice.technology) +
    sumBreakdown(slice.food)
  );
}

export function priorityTotals(needs: SchoolNeeds): Record<PriorityScore, number> {
  return {
    "1": sliceTotal(needs.byPriority?.["1"]),
    "2": sliceTotal(needs.byPriority?.["2"]),
    "3": sliceTotal(needs.byPriority?.["3"]),
    "4": sliceTotal(needs.byPriority?.["4"]),
  };
}

export function needsForPriorities(
  needs: SchoolNeeds,
  selected: readonly string[],
): Pick<
  SchoolNeeds,
  | "facilities"
  | "safety"
  | "technology"
  | "food"
  | "facilitiesTotal"
  | "safetyTotal"
  | "technologyTotal"
  | "foodTotal"
  | "total"
> {
  if (!selected.length) {
    return {
      facilities: {},
      safety: {},
      technology: {},
      food: {},
      facilitiesTotal: 0,
      safetyTotal: 0,
      technologyTotal: 0,
      foodTotal: 0,
      total: 0,
    };
  }
  if (isAllPriorities(selected) || !needs.byPriority) {
    return {
      facilities: needs.facilities,
      safety: needs.safety,
      technology: needs.technology,
      food: needs.food,
      facilitiesTotal: needs.facilitiesTotal,
      safetyTotal: needs.safetyTotal,
      technologyTotal: needs.technologyTotal,
      foodTotal: needs.foodTotal,
      total: needs.total,
    };
  }

  const facilities: CostBreakdown = {};
  const safety: CostBreakdown = {};
  const technology: CostBreakdown = {};
  const food: CostBreakdown = {};
  for (const score of selected) {
    const slice = needs.byPriority[score as PriorityScore];
    if (!slice) continue;
    addBreakdown(facilities, slice.facilities);
    addBreakdown(safety, slice.safety);
    addBreakdown(technology, slice.technology);
    addBreakdown(food, slice.food);
  }
  return {
    facilities,
    safety,
    technology,
    food,
    facilitiesTotal: sumBreakdown(facilities),
    safetyTotal: sumBreakdown(safety),
    technologyTotal: sumBreakdown(technology),
    foodTotal: sumBreakdown(food),
    total:
      sumBreakdown(facilities) +
      sumBreakdown(safety) +
      sumBreakdown(technology) +
      sumBreakdown(food),
  };
}
