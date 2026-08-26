# Geist decision page template

Copy this complete document. Replace `TOPIC`, dates, status, paths, and example content; repeat or remove option and note cards as needed. Preserve the tokens, guide treatment, and feedback widget.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TOPIC</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --geist-bg: #ffffff;
        --geist-fg: #171717;
        --accents-1: #fafafa;
        --accents-2: #eaeaea;
        --accents-3: #999999;
        --accents-5: #666666;
        /* Text tones, not brand fills: both clear WCAG AA on --geist-bg. */
        --text-warning: #8a4b00;
        --text-info: #0057b7;
        --radius: 10px;
        --font-sans:
          "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI",
          sans-serif;
        --font-mono:
          "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --geist-bg: #000000;
          --geist-fg: #ededed;
          --accents-1: #111111;
          --accents-2: #333333;
          --accents-3: #888888;
          --accents-5: #a1a1a1;
          --text-warning: #f5a623;
          --text-info: #52a8ff;
        }
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: var(--geist-bg);
        color: var(--geist-fg);
        font-family: var(--font-sans);
        font-size: 14px;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }
      main {
        max-width: 1000px;
        margin: 0 auto;
        padding: 56px 24px 96px;
      }
      header {
        margin-bottom: 28px;
      }
      .kicker {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accents-3);
        margin-bottom: 10px;
      }
      .decision-status {
        color: var(--geist-fg);
        background: var(--geist-bg);
        border: 1px solid var(--accents-3);
        border-radius: 6px;
        padding: 2px 6px;
        line-height: 1.3;
      }
      h1 {
        font-size: clamp(22px, 4.5vw, 30px);
        font-weight: 600;
        letter-spacing: -0.03em;
        margin: 0 0 8px;
      }
      .sub {
        color: var(--accents-5);
        max-width: 62ch;
        margin: 0;
      }
      .context,
      .recommendation {
        border: 1px solid var(--accents-2);
        border-radius: var(--radius);
        background: var(--accents-1);
        padding: 16px;
      }
      .context {
        margin-bottom: 20px;
      }
      .recommendation {
        margin-top: 20px;
        border-color: color-mix(
          in srgb,
          var(--text-info) 40%,
          var(--accents-2)
        );
      }
      .section-label {
        font-family: var(--font-mono);
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        display: block;
        margin-bottom: 6px;
        color: var(--accents-3);
      }
      .recommendation .section-label {
        color: var(--text-info);
      }
      .context p,
      .recommendation p {
        margin: 0;
      }
      .options-wrap {
        position: relative;
      }
      .guide {
        position: absolute;
        background: var(--accents-5);
        opacity: 0.85;
        pointer-events: none;
      }
      .guide.horizontal {
        left: -12px;
        right: -12px;
        top: 50%;
        height: 1px;
      }
      .guide.vertical {
        top: -12px;
        bottom: -12px;
        left: 50%;
        width: 1px;
      }
      .options {
        position: relative;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
        gap: 12px;
      }
      .option {
        position: relative;
        z-index: 1;
        border: 1px solid var(--accents-2);
        border-radius: var(--radius);
        background: var(--accents-1);
        padding: 16px;
      }
      .option h2 {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 12px;
      }
      .tradeoffs {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 8px;
      }
      .tradeoffs li {
        display: grid;
        grid-template-columns: 22px minmax(0, 1fr);
        gap: 8px;
      }
      .sign {
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
        color: var(--accents-5);
      }
      .sign.minus {
        color: var(--text-warning);
      }
      .notes {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
        gap: 12px;
        margin-top: 28px;
      }
      .note {
        border: 1px solid var(--accents-2);
        border-radius: var(--radius);
        padding: 14px 16px;
      }
      .note .tag {
        font-family: var(--font-mono);
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        display: block;
        margin-bottom: 6px;
        color: var(--accents-3);
      }
      .note.risk {
        border-color: color-mix(
          in srgb,
          var(--text-warning) 40%,
          var(--accents-2)
        );
      }
      .note.risk .tag {
        color: var(--text-warning);
      }
      .note.open {
        border-color: color-mix(
          in srgb,
          var(--text-info) 40%,
          var(--accents-2)
        );
      }
      .note.open .tag {
        color: var(--text-info);
      }
      code {
        font-family: var(--font-mono);
        font-size: 12.5px;
        background: var(--accents-1);
        border: 1px solid var(--accents-2);
        border-radius: 4px;
        padding: 1px 5px;
      }
      @media (max-width: 640px) {
        main {
          padding: 36px 16px 72px;
        }
        .guide {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="kicker">
          <span>Decision · YYYY-MM-DD ·</span
          ><span class="decision-status">proposed</span>
        </div>
        <h1>TOPIC</h1>
        <p class="sub">One sentence naming the decision boundary.</p>
      </header>

      <section class="context">
        <span class="section-label">Context</span>
        <p>
          State the constraint, why the choice matters now, and what success
          means in no more than three sentences.
        </p>
      </section>

      <div class="options-wrap">
        <span class="guide horizontal" aria-hidden="true"></span>
        <span class="guide vertical" aria-hidden="true"></span>
        <section class="options" aria-label="Options">
          <article class="option">
            <span class="section-label">Option A</span>
            <h2>First option</h2>
            <ul class="tradeoffs">
              <li>
                <span class="sign">+</span><span>A concrete advantage.</span>
              </li>
              <li>
                <span class="sign minus">−</span
                ><span>A concrete cost or limitation.</span>
              </li>
            </ul>
          </article>
          <article class="option">
            <span class="section-label">Option B</span>
            <h2>Second option</h2>
            <ul class="tradeoffs">
              <li>
                <span class="sign">+</span><span>A concrete advantage.</span>
              </li>
              <li>
                <span class="sign minus">−</span
                ><span>A concrete cost or limitation.</span>
              </li>
            </ul>
          </article>
        </section>
      </div>

      <section class="recommendation">
        <span class="section-label">Recommendation</span>
        <p>
          <strong>First option.</strong> One line explaining why it best
          satisfies the stated constraint.
        </p>
      </section>

      <section class="notes">
        <div class="note">
          <span class="tag">Note</span>One useful implementation constraint.
        </div>
        <div class="note risk">
          <span class="tag">Risk</span>A risk, stated once.
        </div>
        <div class="note open">
          <span class="tag">Open</span>The decision the reader must make.
        </div>
      </section>

      <!-- feedback-widget:start -->
      <section
        class="feedback"
        id="feedback"
        data-artifact="artifacts/decisions/YYYY-MM-DD-<kebab-slug>.html"
      >
        <div class="fbhead">
          <span class="tag">Feedback</span>
          <span class="fbstatus" id="fbstatus"></span>
        </div>
        <div class="fbrow">
          <label
            ><input type="radio" name="fbkind" value="feedback" />
            Feedback</label
          >
          <label
            ><input type="radio" name="fbkind" value="rfc" checked /> RFC</label
          >
        </div>
        <input
          class="fbtitle"
          id="fbtitle"
          type="text"
          placeholder="One-line title"
          maxlength="120"
        />
        <textarea
          class="fbbody"
          id="fbbody"
          rows="4"
          placeholder="What would you change, and why?"
        ></textarea>
        <div class="fbrow">
          <button class="fbsubmit" id="fbsubmit" type="button">Submit</button>
        </div>
      </section>
      <style>
        .feedback {
          margin-top: 20px;
          border: 1px solid var(--accents-2);
          border-radius: 8px;
          padding: 14px 16px;
          display: grid;
          gap: 10px;
        }
        .feedback .fbhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .feedback .tag {
          font-family: var(--font-mono);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accents-3);
        }
        .feedback .fbstatus {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--accents-5);
        }
        .feedback .fbrow {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 13px;
        }
        .feedback input[type="text"],
        .feedback textarea {
          font: inherit;
          font-size: 13px;
          color: var(--geist-fg);
          background: var(--geist-bg);
          border: 1px solid var(--accents-2);
          border-radius: 6px;
          padding: 8px 10px;
          width: 100%;
          resize: vertical;
          box-sizing: border-box;
        }
        .feedback button {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--geist-fg);
          background: var(--geist-bg);
          border: 1px solid var(--accents-2);
          border-radius: 8px;
          padding: 6px 14px;
          cursor: pointer;
        }
        .feedback button:hover {
          border-color: var(--accents-3);
        }
      </style>
      <script>
        (() => {
          const section = document.getElementById("feedback");
          const status = document.getElementById("fbstatus");
          const submit = document.getElementById("fbsubmit");
          const isFile = location.protocol === "file:";
          if (isFile) submit.textContent = "copy as issue";
          submit.addEventListener("click", async () => {
            const kind = document.querySelector(
              'input[name="fbkind"]:checked'
            ).value;
            const title = document.getElementById("fbtitle").value.trim();
            const body = document.getElementById("fbbody").value.trim();
            if (!title || !body) {
              status.textContent = "title and body required";
              return;
            }
            const artifact = section.dataset.artifact;
            if (isFile) {
              const date = new Date().toISOString().slice(0, 10);
              const md = `# ${title}\n\nStatus: needs-triage\nKind: ${kind}\nArtifact: ${artifact}\nDate: ${date}\n\n${body}\n\n## Comments\n`;
              try {
                await navigator.clipboard.writeText(md);
                status.textContent =
                  "copied — paste into .scratch/artifact-feedback/issues/";
              } catch (e) {
                status.textContent = `copy failed: ${e?.message ?? e}`;
              }
              return;
            }
            try {
              const res = await fetch("/api/artifacts/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ artifact, kind, title, body }),
              });
              const data = await res.json();
              status.textContent = res.ok
                ? `filed: ${data.filed}`
                : `error: ${data.error ?? res.status}`;
            } catch (e) {
              status.textContent = `request failed: ${e?.message ?? e}`;
            }
          });
        })();
      </script>
      <!-- feedback-widget:end -->
    </main>
  </body>
</html>
```
