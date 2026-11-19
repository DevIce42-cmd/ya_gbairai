// Generates a 1080x1920 (9:16) HD Story Card PNG ready for WhatsApp Status, Instagram Story & TikTok

function wrapText(ctx, text, maxWidth, maxLines = 14) {
  const words = String(text || '').replace(/\n+/g, ' \n ').split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (word === '\n') {
      if (current) lines.push(current.trim());
      current = '';
      if (lines.length >= maxLines) break;
      continue;
    }
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current.trim());
      current = word;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current.trim());
  }

  if (lines.length === maxLines) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\.*$/, '') + '…';
  }
  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function generateAndShareStoryCard(post) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const isStory = post.type === 'STORYTIME';

  // 1. Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0B0912');
  bg.addColorStop(0.5, isStory ? '#14112E' : '#1E1122');
  bg.addColorStop(1, '#0B0912');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient Orbs
  const orb1 = ctx.createRadialGradient(180, 280, 20, 180, 280, 520);
  orb1.addColorStop(0, isStory ? 'rgba(99, 102, 241, 0.38)' : 'rgba(255, 107, 91, 0.42)');
  orb1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(900, 1620, 20, 900, 1620, 540);
  orb2.addColorStop(0, isStory ? 'rgba(168, 85, 247, 0.35)' : 'rgba(255, 181, 71, 0.32)');
  orb2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, W, H);

  // 2. Top Brand Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 58px "Plus Jakarta Sans", sans-serif';
  ctx.fillText("🔥 Y'A GBAIRAI !", W / 2, 190);

  ctx.fillStyle = '#B5AED0';
  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('100% ANONYME  •  LES VRAIS DOSSIERS DE BABI', W / 2, 245);

  // 3. Center Glass Card
  const cardX = 84;
  const cardY = 330;
  const cardW = W - 168;
  const cardH = 1220;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 44);
  ctx.fillStyle = 'rgba(23, 19, 37, 0.92)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = isStory ? 'rgba(99, 102, 241, 0.55)' : 'rgba(255, 107, 91, 0.55)';
  ctx.stroke();

  // Top Accent Bar inside card
  const barGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  if (isStory) {
    barGrad.addColorStop(0, '#6366F1');
    barGrad.addColorStop(1, '#A855F7');
  } else {
    barGrad.addColorStop(0, '#FF6B5B');
    barGrad.addColorStop(1, '#FFB547');
  }
  drawRoundedRect(ctx, cardX + 48, cardY + 50, 290, 56, 28);
  ctx.fillStyle = barGrad;
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(isStory ? '📖 STORYTIME' : '🎭 GBAIRAI DRÔLE', cardX + 193, cardY + 87);

  // Author alias
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ABA4C2';
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Par ${post.authorAlias}`, cardX + 54, cardY + 170);

  let cursorY = cardY + 245;

  // Title
  if (post.title) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 46px "Plus Jakarta Sans", sans-serif';
    const titleLines = wrapText(ctx, post.title, cardW - 108, 3);
    for (const line of titleLines) {
      ctx.fillText(line, cardX + 54, cursorY);
      cursorY += 58;
    }
    cursorY += 24;
  }

  // Body content
  ctx.fillStyle = '#F2EEFF';
  ctx.font = '500 38px "Plus Jakarta Sans", sans-serif';
  const bodyLines = wrapText(ctx, post.content, cardW - 108, post.title ? 12 : 15);
  for (const line of bodyLines) {
    ctx.fillText(line, cardX + 54, cursorY);
    cursorY += 54;
  }

  // Reactions footer inside card
  ctx.fillStyle = '#FFB547';
  ctx.font = '700 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(
    `😂 ${post.reactions?.LAUGH || 0}   💀 ${post.reactions?.SKULL || 0}   🤯 ${post.reactions?.MIND_BLOWN || 0}   🔥 ${post.reactions?.FIRE || 0}`,
    cardX + 54,
    cardY + cardH - 60
  );

  // 4. Bottom CTA Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Lis la suite & verse ton gbairai sur :', W / 2, 1675);

  ctx.fillStyle = '#FFB547';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ya-gbairai-web-production.up.railway.app', W / 2, 1735);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
  if (!blob) throw new Error('Erreur génération image');

  const file = new File([blob], `ya-gbairai-${post.id.slice(0, 8)}.png`, { type: 'image/png' });

  // Try native mobile share first if supported
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: "Y'A GBAIRAI !",
        text: "Regarde ce dossier sur Y'A GBAIRAI ! 🔥",
        files: [file],
      });
      return 'shared';
    } catch {
      // User cancelled share or fallback to download
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ya-gbairai-story-${post.id.slice(0, 8)}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
