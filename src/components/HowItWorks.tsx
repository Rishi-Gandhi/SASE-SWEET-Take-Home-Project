import { useCallback, useRef, useState } from 'react';
import { useSectionProgress } from '../hooks/useSectionProgress';
import { assemble, scatterSpread } from '../lib/howItWorks';
import { Cube } from './Cube';

const STEPS = [
  { number: '01', title: 'Enter a username', description: 'Type any GitHub username.' },
  { number: '02', title: 'Fetch public repos', description: "RepoBox calls GitHub's public API." },
  { number: '03', title: 'Sort & filter', description: 'Order by stars or name, then search.' },
] as const;

/**
 * Three isometric cubes that scrolling assembles into one stack and then
 * opens into an exploded view, with the step being described lit in the
 * accent. Scroll is direct manipulation, so this still follows the page
 * under reduced motion — it just adds no animation of its own.
 *
 * Positions are written straight to the DOM on each frame rather than
 * through React state: only the highlighted step, which changes three times
 * in the whole section, re-renders.
 */
export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cubeRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  const guideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [active, setActive] = useState(0);

  const onProgress = useCallback((progress: number) => {
    // Every read happens before any write, so this is one layout per frame.
    const size = cubeRef.current?.offsetWidth || 80;
    const spread = scatterSpread(stageRef.current?.offsetWidth || 900, size);
    const assembly = assemble(progress, size, spread);

    assembly.steps.forEach((pose, i) => {
      const step = stepRefs.current[i];
      const guide = guideRefs.current[i];
      if (!step || !guide) return;
      step.style.setProperty('--x', `${pose.x.toFixed(1)}px`);
      step.style.setProperty('--y', `${pose.y.toFixed(1)}px`);
      guide.style.left = `${pose.guide.left.toFixed(1)}px`;
      guide.style.top = `${pose.guide.top.toFixed(1)}px`;
      guide.style.width = `${pose.guide.width.toFixed(1)}px`;
      guide.style.height = `${pose.guide.height.toFixed(1)}px`;
      guide.style.opacity = pose.guide.opacity.toFixed(2);
    });

    // React skips the render when the step has not changed.
    setActive(assembly.active);
  }, []);

  useSectionProgress(sectionRef, onProgress);

  const current = STEPS[active] ?? STEPS[0];

  return (
    <section ref={sectionRef} id="how-it-works" className="how" aria-labelledby="how-title">
      <div className="how-sticky">
        <div className="gridlines" aria-hidden="true" />

        <h2 id="how-title" className="section-title how-title">
          One username in.
          <br />
          Every repo out.
        </h2>

        <div ref={stageRef} className="how-stage">
          <div className="how-axis" aria-hidden="true" />
          <ol className="how-steps">
            {STEPS.map((step, i) => (
              <li
                key={step.number}
                ref={(node) => {
                  stepRefs.current[i] = node;
                }}
                className={`step ${i === active ? 'is-on' : ''}`}
                // Step 01 tops the stack, so it must paint over the others.
                style={{ zIndex: STEPS.length - i }}
              >
                <div
                  ref={(node) => {
                    guideRefs.current[i] = node;
                  }}
                  className="step-guide"
                  aria-hidden="true"
                />
                <div ref={i === 0 ? cubeRef : undefined} className="step-cube" aria-hidden="true">
                  <Cube iso />
                </div>
                <p className="step-tag">
                  <span className="step-num">{step.number}</span>
                  <span className="step-text">
                    {step.title}
                    <small>{step.description}</small>
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="how-foot">
          <p className="label">Home / How it works</p>
          {/* Restates the list above, so it is not read out twice. */}
          <p className="label how-caption" aria-hidden="true">
            {current.number} · {current.description}
          </p>
        </div>
      </div>
    </section>
  );
}
