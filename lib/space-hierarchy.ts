/**
 * Space Hierarchy — App-Layer Enforcement
 *
 * The `spaces` table has a single self-referential `parent_space_id` column
 * that can point to either another space OR a property (different table).
 * DB constraints cannot express "parent must be X OR Y type" cleanly, so
 * all parent→child validation is done here in app code.
 *
 * To add a new level (e.g. "wing" between property and floor):
 *   1. Add it to this config.
 *   2. Update any "add space" forms/API routes.
 *   3. Zero schema migrations needed.
 */

export const ALLOWED_PARENTS = {
  /** Floors always hang directly off a property — no skip-level. */
  floor: ['property'] as const,
  /** Rooms can be under a property (no floor) or under a floor. */
  room: ['property', 'floor'] as const,
  /** Offices follow the same skip-level flexibility as rooms. */
  office: ['property', 'floor'] as const,
  /** Beds can skip a room entirely — e.g. dorm / hostel-style floor → bed. */
  bed: ['room', 'floor'] as const,
} as const;

export type SpaceType = keyof typeof ALLOWED_PARENTS;
export type ParentType = 'property' | SpaceType;

/**
 * Returns true if the given parentType is a legal parent for childType.
 *
 * @example
 *   validateSpaceParent('bed', 'floor')    // true  — skip-room allowed
 *   validateSpaceParent('bed', 'property') // false
 *   validateSpaceParent('floor', 'floor')  // false — floors can't nest
 */
export function validateSpaceParent(
  childType: SpaceType,
  parentType: ParentType,
): boolean {
  const allowed: readonly string[] = ALLOWED_PARENTS[childType];
  return allowed.includes(parentType as string);
}

/**
 * Throws if the parent→child combination is not in the allowed list.
 * Use in API route handlers before creating/moving a space.
 */
export function assertSpaceParent(
  childType: SpaceType,
  parentType: ParentType,
  parentId: string,
): void {
  if (!validateSpaceParent(childType, parentType)) {
    throw new Error(
      `Invalid parent type "${parentType}" for space type "${childType}". ` +
        `Allowed parents: ${ALLOWED_PARENTS[childType].join(', ')}. ` +
        `Parent ID: ${parentId}`,
    );
  }
}

/**
 * Returns the human-readable list of allowed parent types for a given child.
 * Useful for form validation messages.
 */
export function getAllowedParentLabels(childType: SpaceType): string {
  return ALLOWED_PARENTS[childType].join(' or ');
}
