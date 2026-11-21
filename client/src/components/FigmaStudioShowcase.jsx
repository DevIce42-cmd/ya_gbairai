import React, { useRef, useState } from 'react';

function PillarTag({ label }) {
  return (
    <span className="figma-pillar-tag" data-node-id="2:174">
      {label}
    </span>
  );
}

function ClockIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function FigmaStudioShowcase({
  stats = {},
  onLaunchPrototype,
  onSelectUniverse,
  onOpenComposer,
}) {
  const stage3dRef = useRef(null);
  const [tilt, setTilt] = useState({ rx: 16, ry: -22 });

  function handleStageMove(e) {
    if (e.pointerType !== 'mouse' || !stage3dRef.current) return;
    const rect = stage3dRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((16 - ny * 18).toFixed(2)),
      ry: Number((-22 + nx * 24).toFixed(2)),
    });
  }

  function handleStageLeave() {
    setTilt({ rx: 16, ry: -22 });
  }

  const totalPosts = (stats.confessions || 0) + (stats.stories || 0);

  return (
    <section className="figma-studio-shell" data-node-id="2:176" aria-label="Studio 3D, Shaders et Animations">
      {/* Header matching Figma 2:177 */}
      <div className="figma-studio-header" data-node-id="2:177">
        <div className="figma-studio-titles" data-node-id="2:178">
          <PillarTag label="Y'A GBAIRAI • STUDIO 3D" />
          <h2 className="figma-studio-h2" data-node-id="2:181">
            Expérience Interactive : 3D, Shaders &amp; Animations
          </h2>
          <p className="figma-studio-sub" data-node-id="2:182">
            Architecture issue de votre prototype Figma — Perspective 3D parallaxe, textures procédurales et keyframes temps réel.
          </p>
        </div>

        <button
          type="button"
          className="figma-primary-btn"
          data-node-id="2:183"
          onClick={onLaunchPrototype}
        >
          Lancer le Prototype
        </button>
      </div>

      {/* 3-Column Showcase Grid matching Figma 2:187 */}
      <div className="figma-showcase-grid" data-node-id="2:187">
        {/* Card 1: 3D & Perspective (2:188) */}
        <article className="figma-module-card" data-node-id="2:188">
          <PillarTag label="4.1 • 3D & PERSPECTIVE" />
          <h3 className="figma-module-title" data-node-id="2:191">
            Cartes en Perspective 3D
          </h3>
          <p className="figma-module-desc" data-node-id="2:192">
            Empilement parallaxe (rotateX, rotateY, translateZ) interactif — cliquez une couche pour basculer d&apos;univers.
          </p>

          <div
            ref={stage3dRef}
            className="figma-3d-stage"
            data-node-id="2:193"
            onPointerMove={handleStageMove}
            onPointerLeave={handleStageLeave}
          >
            <button
              type="button"
              className="figma-3d-card figma-3d-back"
              data-node-id="5:35"
              onClick={() => onSelectUniverse('CONFESSION')}
              style={{
                transform: `translateZ(-40px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotateZ(-4deg)`,
              }}
            >
              <span className="figma-3d-kicker">GBAIRAI DRÔLES</span>
              <strong className="figma-3d-label">Couche Z = -40px</strong>
            </button>

            <button
              type="button"
              className="figma-3d-card figma-3d-front"
              data-node-id="5:38"
              onClick={() => onSelectUniverse('STORYTIME')}
              style={{
                transform: `translateZ(45px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) rotateZ(3deg)`,
              }}
            >
              <span className="figma-3d-kicker">STORYTIME 3D</span>
              <strong className="figma-3d-label">Couche Z = +45px</strong>
            </button>
          </div>
        </article>

        {/* Card 2: Shaders & GPU Effects (2:199) */}
        <article className="figma-module-card" data-node-id="2:199">
          <PillarTag label="4.2 • SHADERS WEBGPU" />
          <h3 className="figma-module-title" data-node-id="2:202">
            Textures &amp; Effets Procéduraux
          </h3>
          <p className="figma-module-desc" data-node-id="2:203">
            Effets Nebula, Moving Gradient, Chromatic Glow &amp; suivi en direct de l&apos;activité Y&apos;A GBAIRAI !
          </p>

          <div className="figma-shader-canvas" data-node-id="2:204">
            <div className="figma-shader-nebula" aria-hidden="true" />
            <div className="figma-stats-card" data-node-id="2:205">
              <ClockIcon />
              <strong className="figma-stats-heading">
                {totalPosts > 0 ? `${totalPosts} Dossiers` : '60 FPS'}
              </strong>
              <span className="figma-stats-caption">Shader WebGPU • Live</span>
            </div>
          </div>
        </article>

        {/* Card 3: Motion & Keyframes (2:216 -> 2:222 animated via exact Figma keyframes) */}
        <article className="figma-module-card" data-node-id="2:216">
          <PillarTag label="4.3 • TIMELINE & MOTION" />
          <h3 className="figma-module-title" data-node-id="2:219">
            Animations par Keyframes
          </h3>
          <p className="figma-module-desc" data-node-id="2:220">
            Pistes temporelles exactes (Y + Scale, 2s) importées depuis votre timeline Figma — cliquez pour publier.
          </p>

          <div className="figma-motion-stage" data-node-id="2:221">
            <button
              type="button"
              className="figma-stats-card figma-animated-stats-card"
              data-node-id="2:222"
              onClick={onOpenComposer}
            >
              <ClockIcon />
              <strong className="figma-stats-heading">
                {stats.reactions ? `${stats.reactions} Réactions` : '1.6s'}
              </strong>
              <span className="figma-stats-caption">Keyframes Y + Scale</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
