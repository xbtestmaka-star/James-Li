# James AI

A simple James AI web app with a Node.js/Express backend, OpenAI-powered chat and image generation, local chat history, file/image attachments, and the James AI logo.

## Project structure

```text
jamesai/
├── public/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── jamesai-logo.jpg
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json
├── package-lock.json
├── render.yaml
└── server.js
```

## Run locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env
```

Put your API key in `.env`:

```env
OPENAI_API_KEY=your_real_key_here
```

Then start development mode:

```bash
npm run dev
```

Open `http://localhost:3000`.

For normal production-style start:

```bash
npm start
```

Health check: `http://localhost:3000/api/health`

## GitHub development workflow

1. Create a new GitHub repository, for example `jamesai`.
2. Upload/push the contents of this folder to that repository.
3. Clone it on your computer:

```bash
git clone YOUR_REPOSITORY_URL
cd jamesai
npm install
```

4. Create `.env` from `.env.example` and add your API key.
5. Develop with `npm run dev`.
6. Commit and push changes:

```bash
git add .
git commit -m "Update James AI"
git push
```

### Important security rule

Never commit `.env` or an OpenAI API key. `.gitignore` already excludes `.env` and `node_modules`.

## Deploy

GitHub stores the source code; the Node.js backend should run on a server/hosting platform. This project includes `render.yaml` for a Render deployment.

Set `OPENAI_API_KEY` as a secret/environment variable on the hosting platform. Do not put it in `public/` files.

## Features

- James AI chat
- Image understanding through attachments
- PDF/TXT/CSV/Markdown/JSON and common Office-file attachments
- AI image creation
- Browser-side photo editing tools
- Local browser chat history
- James AI logo/favicon
- Express API backend

## Notes

- Browser photo editing does not require an API call.
- Chat attachments are sent to the backend and then to the AI API.
- The API model names can be configured through environment variables.
