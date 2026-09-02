export const SAFETY_SECURITY_SYSTEM = "Safety and Security";

export const BUILDING_SYSTEM_TIPS: Record<string, string> = {
  Roofing:
    "The roof, insulation, and waterproofing that keep rain and snow out.",
  HVAC:
    "Equipment that heats, cools, and moves air through the building.",
  Electrical:
    "The service, panels, wiring, and lights that power the building.",
  Plumbing:
    "Pipes and fixtures that bring in water and carry waste out.",
  Exterior:
    "Outside walls, windows, and doors that protect the building from weather.",
  Interior:
    "Walls, floors, ceilings, and finishes inside classrooms and other rooms.",
  Structure:
    "The frame and foundation that hold the building up.",
  Site:
    "The grounds around the building, including paving, parking, playgrounds, and outdoor drainage.",
  [SAFETY_SECURITY_SYSTEM]:
    "Security work such as cameras, door phones, and related equipment.",
  "Fire and Life Safety":
    "Fire alarms, sprinklers, and related systems that help people get out safely in an emergency.",
  "Stairs and Elevators":
    "Stairs, elevators, and other ways of moving between floors.",
  "Educational Technology":
    "Classroom and building technology, such as displays and related equipment.",
  Specialties:
    "Built-in items that are not part of the basic building, such as science lab casework or gym equipment.",
  Other:
    "Other building work that is not part of the named systems above.",
};

export const SAFETY_CATEGORY_TIPS: Record<string, string> = {
  Camera:
    "Security cameras and related video equipment.",
  "Door Phone":
    "Door phones and visitor-entry intercoms at building entrances.",
  "POE Switch":
    "Network switches that power and connect security devices, such as cameras.",
};

export function buildingSystemTip(label: string): string {
  return (
    BUILDING_SYSTEM_TIPS[label] ??
    SAFETY_CATEGORY_TIPS[label] ??
    "This group is part of the list of identified facility needs."
  );
}
