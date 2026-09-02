import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { AgeFciChart } from "./AgeFciChart";
import {
  ArticulationChangeBars,
  BirthRateChart,
  ConstructionCostChart,
  EducationalAdequacyChart,
  EnrollmentTrendChart,
  PriorityProjectsChart,
  ReplacementCostChart,
} from "./DykCharts";
import { useExplorer } from "../data/DataProvider";
import { ageConditionStats } from "../lib/ageCondition";
import {
  adequacyStats,
  articulationChangeStats,
  enrollmentTrendStats,
  HISTORICAL_ENROLLMENT_YEAR,
  moreThanBillions,
  moreThanHundredMillions,
  priorityStats,
  replacementStats,
} from "../lib/districtCharts";

const SLIDES: Array<{ id: string }> = [
  { id: "age-condition" },
  { id: "replacement-cost" },
  { id: "priority-projects" },
  { id: "educational-adequacy" },
  { id: "enrollment-decline" },
  { id: "birth-rate" },
  { id: "uneven-change" },
  { id: "construction-cost" },
];

export function DidYouKnowCarousel() {
  const headingId = useId();
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const { data } = useExplorer();
  const ageStats = useMemo(
    () => ageConditionStats(data.schools),
    [data.schools],
  );
  const replaceStats = useMemo(
    () => replacementStats(data.schools),
    [data.schools],
  );
  const projectStats = useMemo(
    () => priorityStats(data.schools),
    [data.schools],
  );
  const eaStats = useMemo(
    () => adequacyStats(data.schools),
    [data.schools],
  );
  const enrollStats = useMemo(
    () => enrollmentTrendStats(data.schools),
    [data.schools],
  );
  const areaStats = useMemo(
    () => articulationChangeStats(data.schools),
    [data.schools],
  );

  const ageFact =
    "More than half of Jeffco’s school buildings are 50 years or older, and building age is one of the clearest predictors of a building’s condition?";
  const replaceFact =
    replaceStats.allCost > 0
      ? `It would cost more than ${moreThanBillions(replaceStats.allCost)} to replace all Jeffco facilities at today’s construction costs, and more than ${moreThanBillions(replaceStats.olderCost)} to replace buildings that are more than 50 years old alone?`
      : "It would cost more than $6 billion to replace all Jeffco facilities at today’s construction costs, and more than $3 billion to replace buildings that are more than 50 years old alone?";
  const priorityFact =
    projectStats.facilitiesTotal > 0
      ? `Even with recent investments, there are more than ${moreThanHundredMillions(projectStats.facilitiesTotal)} of priority capital projects identified? These are only projects to address critical building systems and assets.`
      : "Even with recent investments, there are more than $500 million of priority capital projects identified? These are only projects to address critical building systems and assets.";
  const enrollFact =
    "Like districts across Colorado and the nation, Jeffco is experiencing enrollment declines that directly affect school funding, making it more important than ever to be thoughtful about where investment goes?";
  const birthFact =
    "Falling birth rates—not families leaving—are the primary driver of Jeffco’s enrollment decline, and the district still enrolls more than 90% of school-age kids within the district boundary?";
  const unevenFact = `Enrollment change is not felt evenly across the district, with some areas experiencing significant student loss while others have seen growth since ${HISTORICAL_ENROLLMENT_YEAR}?`;

  function factFor(id: string): ReactNode {
    switch (id) {
      case "age-condition":
        return ageFact;
      case "replacement-cost":
        return replaceFact;
      case "priority-projects":
        return priorityFact;
      case "educational-adequacy":
        return "Nearly a third of Jeffco school buildings fall short of modern standards for supporting teaching and learning?";
      case "enrollment-decline":
        return enrollFact;
      case "birth-rate":
        return birthFact;
      case "uneven-change":
        return unevenFact;
      case "construction-cost":
        return "The cost per square foot for building construction and maintenance increases each year in Jeffco, across Colorado, and nationwide, so delaying facility repairs can make them exponentially more expensive?";
      default:
        return "";
    }
  }

  function chartsFor(id: string): ReactNode {
    switch (id) {
      case "age-condition":
        return (
          <AgeFciChart
            decades={ageStats.decades}
            maxTotal={ageStats.maxTotal}
          />
        );
      case "replacement-cost":
        return <ReplacementCostChart stats={replaceStats} />;
      case "priority-projects":
        return <PriorityProjectsChart stats={projectStats} />;
      case "educational-adequacy":
        return <EducationalAdequacyChart stats={eaStats} />;
      case "enrollment-decline":
        return <EnrollmentTrendChart stats={enrollStats} />;
      case "birth-rate":
        return <BirthRateChart />;
      case "uneven-change":
        return <ArticulationChangeBars stats={areaStats} />;
      case "construction-cost":
        return <ConstructionCostChart />;
      default:
        return null;
    }
  }

  function goTo(next: number) {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }

  function stopAutoplay() {
    setAutoplay(false);
  }

  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoplay]);

  return (
    <section
      className="dyk-carousel"
      aria-roledescription="carousel"
      aria-labelledby={headingId}
      tabIndex={0}
      onClick={stopAutoplay}
      onMouseOver={(event) => {
        const target = event.target as Element | null;
        if (target?.closest(".dyk-chart, .age-fci")) stopAutoplay();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          stopAutoplay();
          goTo(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          stopAutoplay();
          goTo(index + 1);
        }
      }}
    >
      <h2 id={headingId} className="dyk-title">
        Did you Know?
      </h2>
      <p className="dyk-subtitle">
        Before exploring data at the individual school level, take a moment to
        see the bigger picture. These key district-wide facts and figures
        provide important context for Jeffco’s capital planning work.
      </p>
      <hr className="dyk-rule" />

      <div className="dyk-stage">
        {SLIDES.map((item, itemIndex) => {
          const active = itemIndex === index;
          return (
            <div
              key={item.id}
              className="dyk-slide"
              aria-hidden={!active}
              inert={!active}
              aria-live={active ? "polite" : undefined}
              aria-atomic={active ? "true" : undefined}
            >
              <p className="dyk-fact">{factFor(item.id)}</p>
              {chartsFor(item.id)}
            </div>
          );
        })}
      </div>

      <div className="dyk-controls">
        <button
          type="button"
          className="dyk-nav"
          onClick={() => goTo(index - 1)}
          aria-label="Previous fact"
        >
          Previous
        </button>
        <div className="dyk-pager">
          <div className="dyk-dots" role="group" aria-label="Did you know slides">
            {SLIDES.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-current={itemIndex === index ? "true" : undefined}
                aria-label={`Show fact ${itemIndex + 1} of ${SLIDES.length}`}
                className={itemIndex === index ? "is-active" : undefined}
                onClick={() => goTo(itemIndex)}
              />
            ))}
          </div>
          <p className="dyk-status">
            {index + 1} of {SLIDES.length}
          </p>
        </div>
        <button
          type="button"
          className="dyk-nav"
          onClick={() => goTo(index + 1)}
          aria-label="Next fact"
        >
          Next
        </button>
      </div>
    </section>
  );
}
