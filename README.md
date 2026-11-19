# 🔥 Y'A GBAIRAI !

Plateforme communautaire combinant **Confessions Anonymes Drôles** et **Storytimes** à épisodes (*Partie 1, Partie 2…*).

## Stack
- **Backend** : Node.js, Express, Prisma ORM (SQLite en local, prêt pour PostgreSQL en production)
- **Frontend** : React + Vite (*Dark Mode* par défaut + *Light Mode*, *mobile-first*)

## Lancer en local
```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run build
npm start
```
Puis ouvrez `http://127.0.0.1:3000`.

## Déployer sur Render
1. Poussez ce dépôt sur GitHub.
2. Sur [Render](https://render.com), cliquez sur **New + → Blueprint** (ou **Web Service**) et sélectionnez votre dépôt `ya-gbairai`.
3. Render détectera automatiquement `render.yaml` (`buildCommand: npm run build:render`, `startCommand: npm run start:prod`).
4. Notez votre variable `ADMIN_KEY` dans **Environment** sur Render pour accéder à l'onglet **🛡️ Modération**.

> **Astuce production (persistance définitive)** : sur le plan gratuit de Render, le disque local SQLite est réinitialisé à chaque redéploiement. Pour conserver vos données durablement, créez une base **PostgreSQL** gratuite sur Render (ou Neon/Supabase), remplacez `provider = "sqlite"` par `provider = "postgresql"` dans `prisma/schema.prisma`, puis mettez l'URL PostgreSQL dans la variable `DATABASE_URL` sur Render.
