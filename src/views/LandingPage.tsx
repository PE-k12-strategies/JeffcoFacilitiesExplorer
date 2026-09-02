import { Link } from "react-router-dom";
import { DidYouKnowCarousel } from "../components/DidYouKnowCarousel";
import { assetUrl } from "../lib/assetUrl";

const MASTER_PLAN_URL = "#master-plan";
const BOUNDARY_STUDY_URL =
  "https://www.jeffcopublicschools.org/services/facilities/boundary-study";

export function LandingPage() {
  return (
    <>
      <section className="hero-band">
        <div className="hero-band-media" aria-hidden="true">
          <img src={assetUrl("images/hero-students.jpg")} alt="" />
        </div>
        <div className="page hero">
          <div className="hero-copy">
            <p className="eyebrow">Jeffco Facilities Explorer</p>
            <h1>See how Jeffco is planning for the long-term health of its schools.</h1>
            <p className="lede">
              As Jefferson County Public Schools (Jeffco) looks toward the future,
              the district is committed to a holistic, comprehensive approach to
              capital planning, one that is transparent, data-informed, and rooted
              in the needs of every student, school, and community. This
              Facilities Explorer is a public resource: an open window into the
              data that will inform and support future capital projects across the
              district.
            </p>
            <div className="cta-row">
              <Link className="btn btn-primary" to="/map">
                Explore the map
              </Link>
              <Link className="btn" to="/schools">
                Find a school
              </Link>
            </div>
          </div>
          <DidYouKnowCarousel />
        </div>
      </section>

      <div className="page">
        <div className="question-grid">
          <article className="question-card" id="data">
            <div className="question-card-media">
              <img
                src={assetUrl("images/card-learning.jpg")}
                alt="A Jeffco teacher working with a student at Lumberg Elementary"
              />
            </div>
            <p className="eyebrow">01</p>
            <h2>Balancing needs across the district</h2>
            <p>
              The information presented here reflects the breadth of factors
              considered in Jeffco’s capital planning process, from facility
              conditions and enrollment trends to demographic shifts and program
              needs.
            </p>
            <p>
              Some communities have fewer students even as buildings continue to
              age. Evaluating the portfolio from multiple angles helps Jeffco
              direct limited dollars where they can do the most for teaching and
              learning, taking a needs-based approach rather than spreading
              resources too thin across every space.
            </p>
          </article>

          <article className="question-card" id="engagement">
            <div className="question-card-media">
              <img
                src={assetUrl("images/card-community.jpg")}
                alt="Jeffco elementary students in a classroom"
              />
            </div>
            <p className="eyebrow">02</p>
            <h2>A public window into planning</h2>
            <p>
              By making this data accessible, Jeffco reaffirms its commitment to
              community engagement and to transparency and consistency in how
              facility decisions are made, prioritizing what best serves students
              and the long-term health of our schools. Families, staff, and
              community members can see the same planning picture the district
              uses as it evaluates buildings, programs, and investment priorities.
            </p>
            <p>
              Understanding the district as a whole, from the total number of
              facilities we maintain to enrollment patterns and facility needs,
              helps frame the conversations and decisions that shape our schools
              at every level.
            </p>
          </article>

          <article className="question-card" id="master-plan">
            <div className="question-card-media">
              <img
                src={assetUrl("images/card-schools.jpg")}
                alt="Jeffco students in hard hats touring a school gym under construction"
              />
            </div>
            <p className="eyebrow">03</p>
            <h2>Tied to ongoing efforts</h2>
            <p>
              This explorer is directly connected to the district’s{" "}
              <a className="link-strong" href={MASTER_PLAN_URL}>
                Strategic Capital Master Plan
              </a>
              , which provides the overarching framework for evaluating,
              prioritizing, and advancing capital investments across Jeffco.
            </p>
            <p>
              The Master Plan is a living guide, aligning facility decisions with
              the district’s educational goals, fiscal realities, and the
              evolving needs of our community.
            </p>
            <p>
              It also builds on the 2023–24{" "}
              <a
                className="link-strong"
                href={BOUNDARY_STUDY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Boundary Study
              </a>
              , which examined enrollment trends, school choice, and programs to
              inform facilities planning.
            </p>
          </article>
        </div>
      </div>
    </>
  );
}
