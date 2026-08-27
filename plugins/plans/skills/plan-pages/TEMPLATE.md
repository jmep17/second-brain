# Geist plan page template

Copy this complete document. Replace `TOPIC`, dates, paths, and example content; repeat or remove step, dependency, and note cards as needed. Preserve the tokens and feedback widget.

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
        scrollbar-width: thin;
        scrollbar-color: var(--accents-2) transparent;
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
        max-width: 920px;
        margin: 0 auto;
        padding: 56px 24px 96px;
      }
      header {
        margin-bottom: 28px;
      }
      .kicker {
        font-family: var(--font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accents-3);
        margin-bottom: 10px;
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
      .steps {
        display: grid;
        gap: 12px;
      }
      .step {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        gap: 14px;
        align-items: start;
        border: 1px solid var(--accents-2);
        border-radius: var(--radius);
        background: var(--accents-1);
        padding: 16px;
      }
      .stepno {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--accents-5);
        padding-top: 2px;
      }
      .step h2 {
        font-size: 15px;
        font-weight: 600;
        margin: 0 0 4px;
      }
      .step p {
        color: var(--accents-5);
        margin: 0;
      }
      .status {
        font-family: var(--font-mono);
        font-size: 10.5px;
        line-height: 1;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        border: 1px solid var(--accents-3);
        border-radius: 6px;
        padding: 5px 7px;
        color: var(--geist-fg);
        background: var(--geist-bg);
      }
      .status.doing {
        color: var(--text-info);
        border-color: color-mix(
          in srgb,
          var(--text-info) 55%,
          var(--accents-2)
        );
      }
      .status.blocked {
        color: var(--text-warning);
        border-color: color-mix(
          in srgb,
          var(--text-warning) 55%,
          var(--accents-2)
        );
      }
      .dependencies {
        margin-top: 20px;
        border: 1px solid var(--accents-2);
        border-radius: var(--radius);
        background: var(--accents-1);
        padding: 14px 16px;
      }
      .dependencies .tag {
        font-family: var(--font-mono);
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--accents-3);
        display: block;
        margin-bottom: 8px;
      }
      .dependencies ul {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 18px;
        list-style: none;
        padding: 0;
        margin: 0;
        font-family: var(--font-mono);
        font-size: 12.5px;
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
        .step {
          grid-template-columns: 32px minmax(0, 1fr);
        }
        .status {
          grid-column: 2;
          justify-self: start;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="kicker">Plan · YYYY-MM-DD · ordered steps</div>
        <h1>TOPIC</h1>
        <p class="sub">One sentence defining the outcome and boundary.</p>
      </header>

      <section class="steps" aria-label="Plan steps">
        <article class="step">
          <span class="stepno">01</span>
          <div>
            <h2>First step</h2>
            <p>One-line detail describing the observable result.</p>
          </div>
          <span class="status done">done</span>
        </article>
        <article class="step">
          <span class="stepno">02</span>
          <div>
            <h2>Second step</h2>
            <p>One-line detail describing the observable result.</p>
          </div>
          <span class="status doing">doing</span>
        </article>
        <article class="step">
          <span class="stepno">03</span>
          <div>
            <h2>Third step</h2>
            <p>One-line detail describing the observable result.</p>
          </div>
          <span class="status blocked">blocked</span>
        </article>
      </section>

      <section class="dependencies" aria-label="Dependencies">
        <span class="tag">Dependencies</span>
        <ul>
          <li>02 ← 01</li>
          <li>03 ← 01, 02</li>
        </ul>
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
        data-artifact="artifacts/plans/YYYY-MM-DD-<kebab-slug>.html"
      >
        <div class="fbhead">
          <span class="tag">Feedback</span>
          <span class="fbstatus" id="fbstatus"></span>
        </div>
        <div class="fbrow">
          <label
            ><input type="radio" name="fbkind" value="feedback" checked />
            Feedback</label
          >
          <label><input type="radio" name="fbkind" value="rfc" /> RFC</label>
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
