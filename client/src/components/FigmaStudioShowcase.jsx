import React, { useRef, useState } from 'react';

function PillarTag({ label, tone = 'coral' }) {
  return (
    <span className={`figma-pillar-tag tone-${tone}`} data-node-id="2:174">
      {label}
    </span>
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
    <section className="figma-studio-shell" data-node-id="2:176" aria-label="Les 3 piliers Y'A GBAIRAI !">
      <div className="figma-studio-header" data-node-id="2:177">
        <div className="figma-studio-titles" data-node-id="2:178">
          <PillarTag label="🔥 Y'A GBAIRAI • LE MOUVEMENT" tone="coral" />
          <h2 className="figma-studio-h2" data-node-id="2:181">
            Deux univers, mille fous rires <span className="text-coral">en scred</span>
          </h2>
          <p className="figma-studio-sub" data-node-id="2:182">
            Bascule entre les gbairais drôles et les Storytimes en épisodes, suis le buzz en direct et verse ton dossier sans montrer ton visage.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-coral"
          data-node-id="2:183"
          onClick={onLaunchPrototype}
        >
          🎲 Surprends-moi
        </button>
      </div>

      <div className="figma-showcase-grid" data-node-id="2:187">
        {/* Card 1: Double Univers 3D */}
        <article className="figma-module-card" data-node-id="2:188">
          <PillarTag label="🎭 DOUBLE UNIVERS" tone="coral" />
          <h3 className="figma-module-title" data-node-id="2:191">
            Gbairai &amp; Storytime
          </h3>
          <p className="figma-module-desc" data-node-id="2:192">
            Clique une carte 3D pour plonger dans les anecdotes courtes pimentées ou les longs récits à épisodes.
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
              <span className="figma-3d-kicker">🎭 CONFESSIONS</span>
              <strong className="figma-3d-label">Gbairai Drôles</strong>
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
              <span className="figma-3d-kicker">📖 ÉPISODES</span>
              <strong className="figma-3d-label">Storytime</strong>
            </button>
          </div>
        </article>

        {/* Card 2: En direct à Babi (Brand Nebula Shader) */}
        <article className="figma-module-card" data-node-id="2:199">
          <PillarTag label="⚡ EN DIRECT À BABI" tone="indigo" />
          <h3 className="figma-module-title" data-node-id="2:202">
            La Famille en Temps Réel
          </h3>
          <p className="figma-module-desc" data-node-id="2:203">
            De vrais dossiers publiés 24h/24 par la communauté — zéro bot, zéro djê, 100% authentique.
          </p>

          <div className="figma-shader-canvas" data-node-id="2:204">
            <div className="figma-shader-nebula" aria-hidden="true" />
            <div className="figma-stats-card" data-node-id="2:205">
              <span className="figma-stats-emoji" aria-hidden="true">🔥</span>
              <strong className="figma-stats-heading">
                {totalPosts > 0 ? `${totalPosts} Dossier${totalPosts > 1 ? 's' : ''}` : 'En feu 24/24'}
              </strong>
              <span className="figma-stats-caption">100% Réel • Zéro bot</span>
            </div>
          </div>
        </article>

        {/* Card 3: Balance Ton Dossier (Exact Figma Keyframe Motion) */}
        <article className="figma-module-card" data-node-id="2:216">
          <PillarTag label="🤫 TON TOUR EN SCRED" tone="amber" />
          <h3 className="figma-module-title" data-node-id="2:219">
            Balance Ton Dossier
          </h3>
          <p className="figma-module-desc" data-node-id="2:220">
            Un blase anonyme généré en 1 clic, un vrai Kpata caché sous flou et des réactions qui pleuvent.
          </p>

          <div className="figma-motion-stage" data-node-id="2:221">
            <button
              type="button"
              className="figma-stats-card figma-animated-stats-card"
              data-node-id="2:222"
              onClick={onOpenComposer}
            >
              <span className="figma-stats-emoji" aria-hidden="true">🎭</span>
              <strong className="figma-stats-heading">
                {stats.reactions > 0 ? `${stats.reactions} Réactions` : '100% Anonyme'}
              </strong>
              <span className="figma-stats-caption text-amber">Clique pour verser →</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
