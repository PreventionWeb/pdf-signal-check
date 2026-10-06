import React, { useMemo } from "react";
import { normalizeFindings } from "../review/findings.js";
import { SEMANTIC_MODELS, getSemanticModel, supportsLanguage } from "../engine/models.js";

import { Help } from "../help/Help.jsx";
import { Button, Card, Details, Notice, Checkbox, Radio, FormGroup, Tag } from "../ui/react.jsx";

const checkChoices = [
  ["title", "Publication title"],
  ["subject", "Subject"],
  ["keywords", "Each keyword"],
  ["sections", "Tagged headings and section text"],
];
const assetSizes = model => `${(model.graphBytes / 1e6).toFixed(2)} MB model + ${(model.tokenizerBytes / 1e6).toFixed(2)} MB tokenizer`;

export function Checks({ state, controller, calibrationRef, batchBusy, canCalibrate }) {
  const normalized = useMemo(() => normalizeFindings(state.report), [state.report]);
  const problems = normalized.findings.filter(f => ["required-defect", "required-indeterminate", "advisory-concern"].includes(f.category)).length;
  const declared = state.report.metadata.language;
  const missing = declared == null || (typeof declared === "string" && !declared.trim());
  const language = state.languageAssumption || declared;
  const suggested = SEMANTIC_MODELS.find(model => supportsLanguage(model, language));
  const model = state.selectedModel ? getSemanticModel(state.selectedModel) : suggested;
  const eligible = model && supportsLanguage(model, language);
  const busy = state.modelBusy || state.calibrationBusy || batchBusy;

  return (
    <>
      <Notice
        title={problems ? `${problems} finding${problems === 1 ? "" : "s"} to inspect` : "No concrete problems found"}
        headingLevel="h2"
        description={state.report.accepted
          ? "The required text profile passed. Metadata and reading order still need separate review."
          : state.report.checks.some(c => c.status === "fail")
            ? "The required text profile failed: required defects were found. Inspect their evidence."
            : "The required text profile was not established. Inspect the required findings."}
      />
      <h2 className="screening-heading">{state.aiEnabled ? "Complete your evaluation" : "Your check results"}</h2>
      <div className={`screening-options ${!state.aiEnabled ? "is-no-ai" : ""}`}>
        <Card className="screening-without-ai">
          <p className="eyebrow">Evaluation status</p>
          <h2 className="mg-card__title">{!state.aiEnabled ? "Text checks completed" : state.report.semantic?.inferencePerformed ? "AI screening completed" : "AI screening needs attention"}</h2>
          <p className="mg-card__summary">{!state.aiEnabled ? "No AI model is selected for new PDFs. Review text, structure and metadata findings; any previously completed AI results remain in this report." : state.report.semantic?.inferencePerformed ? "Review the model’s findings alongside text, structure and metadata checks." : "Text checks are retained, but AI screening has not completed. Resolve the language or model issue, then run AI to complete this evaluation."}</p>
          <p className="model-note">Required text checks remain separate from AI findings.</p>
          <Button onClick={() => controller.go("review")}>{!state.aiEnabled || state.report.semantic?.inferencePerformed ? "Review findings" : "Inspect partial results"}</Button>
        </Card>
        {state.aiEnabled && <Card className="screening-ai">
          <p className="eyebrow">Local AI screening</p>
          <h2 className="mg-card__title">Download assets and run local AI</h2>
          <p className="mg-card__summary">
            Compare PDF metadata with publication text. AI checks provide advisory
            clues; they do not verify facts, authorship or reading order,
            and can make mistakes.
          </p>
          {missing ? (
            <Notice variant="warning" title="PDF language is not indicated" headingLevel="h3">
              <p>Missing language can cause unsuitable reading or processing settings. Set it in your source document and export again.</p>
              <Checkbox
                id="assume-english"
                label="Assume English for AI screening"
                checked={state.languageAssumption === "en"}
                disabled={busy}
                onChange={e => controller.setLanguageAssumption(e.target.checked ? "en" : null)}
              />
              <p>Choose this only for English text. It starts no downloads and does not fix the PDF or change its required language check.</p>
            </Notice>
          ) : !suggested && (
            <Notice variant="warning" title="The declared language is not supported" headingLevel="h3">
              <p>The PDF declares “{declared}”. Check this declaration in your source document; the shipped models cannot screen it.</p>
            </Notice>
          )}
          {model && (
            <div className="screening-selected-model">
              <p><strong>{model.label}</strong>{model.key === suggested?.key && <Tag subtle>Suggested</Tag>}</p>
              <p>{state.languageAssumption ? "English is your explicit assumption; the PDF declaration remains missing." : model.language + "."}</p>
              <p className="model-note"><strong>Selected checks:</strong> {checkChoices.filter(([key]) => state.checks.includes(key)).map(([, label]) => label).join(", ") || "None"}.</p>
              <p><strong>{assetSizes(model)}</strong> on first use.</p>
              <p className="model-note">Runtime assets are separate: approximately 26.86 MB uncompressed WASM, plus JavaScript. Transfer/cache cost varies. PDF text stays on your device.</p>
              {!eligible && <p className="error-message">{missing ? "If this document is English, select the assumption above. Otherwise set its language in the source document and re-export." : "This model does not cover the screening language. Choose a supported model below."}</p>}
            </div>
          )}
          <Button
            variant="primary"
            disabled={!eligible || !state.checks.length || busy}
            onClick={() => {
              if (!state.selectedModel) controller.setModel(model.key);
              controller.runScreening();
            }}
          >Download assets and run local AI</Button>
          {!model && <p className="model-note">{missing ? "Choose the English assumption above if appropriate to enable this option." : "AI screening is unavailable for this language."} You can inspect the retained text checks while resolving this issue.</p>}
          {!state.checks.length && <p className="model-note">Select at least one screening check below.</p>}
          <Details summary="Change AI settings" className="screening-settings">
            <p>Choosing settings starts no downloads. The action above runs the selected model and checks.</p>
            <FormGroup legend="AI model" disabled={busy}>
              <div className="screening-model-options">
                {SEMANTIC_MODELS.map(option => (
                  <Card as="div" key={option.key} className={`screening-model-option ${model?.key === option.key ? "is-selected" : ""}`}>
                    <Radio
                      id={`screening-model-${option.key}`}
                      name="screening-model"
                      label={option.label}
                      value={option.key}
                      checked={model?.key === option.key}
                      disabled={busy || !supportsLanguage(option, language)}
                      onChange={() => controller.setModel(option.key)}
                    />
                    <p>{option.tradeoff}</p>
                    <p className="model-note">{assetSizes(option)} · {option.maxTokens}-token cap.</p>
                    <div className="screening-model-language">
                      <span>{supportsLanguage(option, language) ? "Supports the screening language" : "Does not cover the screening language"}</span>
                      <Help topic="ai" label={`Supported languages for ${option.label}`} extraText={`Explicitly supported languages: ${option.languages.map(code => new Intl.DisplayNames(["en"], { type: "language" }).of(code)).join(", ")}. This does not establish accuracy for this PDF.`} />
                    </div>
                  </Card>
                ))}
              </div>
            </FormGroup>
            <FormGroup legend="Checks to screen" disabled={busy} className="screening-checks">
              {checkChoices.map(([key, label]) => (
                <Checkbox key={key} id={`single-check-${key}`} label={label} checked={state.checks.includes(key)} disabled={busy}
                  onChange={e => controller.setChecks(e.target.checked ? [...state.checks, key] : state.checks.filter(check => check !== key))} />
              ))}
            </FormGroup>
            <p className="model-note">Title rules still run first. Section screening compares bounded tagged headings with following text; it does not validate every heading or the whole document. Scores are relatedness, not probabilities of correctness.</p>
          </Details>
        </Card>}

      <Card className="screening-benchmark">
        <h2 className="mg-card__title">Device and model setup</h2>
        <p className="model-note">Benchmark speed, then choose an AI model or continue without one. Saved benchmark results stay on this browser.</p>
        <Button onClick={() => controller.openSetup("checks")}>Open AI setup</Button>
      </Card>
      </div>
      {state.message && <p className="model-note" role="status">{state.message}</p>}
      <Button onClick={() => controller.go("document")}>Choose another PDF</Button>
    </>
  );
}
