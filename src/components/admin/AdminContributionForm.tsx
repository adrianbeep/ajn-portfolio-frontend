import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { MouseEvent } from 'react';
import type { ContributionDetailDto } from '../../lib/types';
import { renderMarkdown } from '../../lib/markdown';
import '../../styles/editorial.css';

type Mode = 'create' | 'edit';

interface Props {
  mode: Mode;
  initial?: ContributionDetailDto;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TITLE_MAX = 120;
const SLUG_MAX = 80;
const DESCRIPTION_MAX = 500;
const URL_MAX = 500;

interface FormState {
  title: string;
  slug: string;
  urlThumbnail: string;
  urlPrContribution: string;
  description: string;
  content: string;
  slugManuallyEdited: boolean;
}

type Tab = 'edit' | 'preview';

function deriveSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function isSameState(a: FormState, b: FormState): boolean {
  return (
    a.title === b.title &&
    a.slug === b.slug &&
    a.urlThumbnail === b.urlThumbnail &&
    a.urlPrContribution === b.urlPrContribution &&
    a.description === b.description &&
    a.content === b.content
  );
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function AdminContributionForm({ mode, initial }: Props) {
  const initialState = useMemo<FormState>(
    () => ({
      title: initial?.title ?? '',
      slug: initial?.slug ?? '',
      urlThumbnail: initial?.urlThumbnail ?? '',
      urlPrContribution: initial?.urlPrContribution ?? '',
      description: initial?.description ?? '',
      content: initial?.content ?? '',
      slugManuallyEdited: mode === 'edit',
    }),
    [initial, mode],
  );

  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('edit');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const initialStateRef = useRef(initialState);
  const submitAttemptedRef = useRef(false);

  useEffect(() => {
    initialStateRef.current = initialState;
  }, [initialState]);

  // === Slug auto-derive ====================================================
  useEffect(() => {
    if (mode === 'create' && !state.slugManuallyEdited) {
      const derived = deriveSlug(state.title);
      if (derived !== state.slug) {
        setState((s) => ({ ...s, slug: derived }));
      }
    }
  }, [state.title, state.slugManuallyEdited, mode, state.slug]);

  // === Real-time validation (debounced) ====================================
  const debouncedState = useDebouncedValue(state, 250);

  const validation = useMemo<Record<string, string>>(() => {
    const e: Record<string, string> = {};
    if (!debouncedState.title.trim()) e.title = 'El título es obligatorio.';
    else if (debouncedState.title.length > TITLE_MAX)
      e.title = `El título debe tener ${TITLE_MAX} caracteres o menos.`;

    if (!debouncedState.slug.trim()) e.slug = 'El slug es obligatorio.';
    else if (debouncedState.slug.length > SLUG_MAX)
      e.slug = `El slug debe tener ${SLUG_MAX} caracteres o menos.`;
    else if (!SLUG_REGEX.test(debouncedState.slug)) {
      e.slug = 'Solo minúsculas, dígitos y guiones simples (ej. "mi-pr").';
    }

    if (!debouncedState.urlThumbnail.trim())
      e.urlThumbnail = 'La URL del thumbnail es obligatoria.';
    else if (debouncedState.urlThumbnail.length > URL_MAX)
      e.urlThumbnail = `La URL debe tener ${URL_MAX} caracteres o menos.`;
    else if (!isValidUrl(debouncedState.urlThumbnail)) {
      e.urlThumbnail = 'Debe ser una URL absoluta válida (http o https).';
    }

    if (!debouncedState.urlPrContribution.trim())
      e.urlPrContribution = 'La URL de la contribución es obligatoria.';
    else if (debouncedState.urlPrContribution.length > URL_MAX)
      e.urlPrContribution = `La URL debe tener ${URL_MAX} caracteres o menos.`;
    else if (!isValidUrl(debouncedState.urlPrContribution)) {
      e.urlPrContribution = 'Debe ser una URL absoluta válida (http o https).';
    }

    if (!debouncedState.description.trim())
      e.description = 'La descripción es obligatoria.';
    else if (debouncedState.description.length > DESCRIPTION_MAX)
      e.description = `La descripción debe tener ${DESCRIPTION_MAX} caracteres o menos.`;

    if (!debouncedState.content.trim()) e.content = 'El contenido es obligatorio.';

    return e;
  }, [debouncedState]);

  useEffect(() => {
    setErrors(() => {
      const next: Record<string, string> = {};
      for (const key of Object.keys(validation)) {
        if (touched[key] || submitAttemptedRef.current) {
          next[key] = validation[key]!;
        }
      }
      return next;
    });
  }, [validation, touched]);

  // === Dirty state + beforeunload ==========================================
  const isDirty = !isSameState(state, initialStateRef.current);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty && !submitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, submitting]);

  // === Markdown preview ====================================================
  const debouncedContent = useDebouncedValue(state.content, 300);

  useEffect(() => {
    let cancelled = false;
    if (tab !== 'preview') return;
    if (!debouncedContent.trim()) {
      setPreviewHtml('');
      return;
    }
    renderMarkdown(debouncedContent)
      .then((html) => {
        if (!cancelled) setPreviewHtml(html);
      })
      .catch((err) => {
        console.error('Markdown render error:', err);
        if (!cancelled) setPreviewHtml('<p>No se pudo renderizar la vista previa.</p>');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedContent, tab]);

  const isValid = Object.keys(validation).length === 0;
  const slugChanged = mode === 'edit' && initial && state.slug !== initial.slug;

  // === Submit ==============================================================
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submitAttemptedRef.current = true;
    setTouched({
      title: true,
      slug: true,
      urlThumbnail: true,
      urlPrContribution: true,
      description: true,
      content: true,
    });
    if (!isValid || submitting) {
      const firstKey = Object.keys(validation)[0];
      if (firstKey) {
        const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.focus();
        }
      }
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      let response: Response;
      const payload = {
        title: state.title,
        slug: state.slug,
        urlThumbnail: state.urlThumbnail,
        urlPrContribution: state.urlPrContribution,
        description: state.description,
        content: state.content,
      };

      if (mode === 'create') {
        response = await fetch('/api/admin/contributions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Edit mode. The `id` field is IGNORED by the server per contract §10.
        response = await fetch(`/api/admin/contributions/${encodeURIComponent(initial!.slug)}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: crypto.randomUUID(), ...payload }),
        });
      }

      if (!response.ok) {
        let problem: { title?: string; detail?: string } = {};
        try {
          problem = await response.json();
        } catch {
          // ignore
        }

        if (problem.title === 'ValidationFailed' && problem.detail) {
          const fieldErrors: Record<string, string> = {};
          problem.detail.split('; ').forEach((pair) => {
            const [field, ...rest] = pair.split(' : ');
            if (field && rest.length) {
              fieldErrors[field.trim()] = rest.join(' : ').trim();
            }
          });
          setErrors(fieldErrors);
          setSubmitError('Corregí los errores abajo.');
          const firstKey = Object.keys(fieldErrors)[0];
          if (firstKey) {
            const el = formRef.current?.querySelector<HTMLElement>(`[name="${firstKey}"]`);
            if (el) {
              el.scrollIntoView({ block: 'center', behavior: 'smooth' });
              el.focus();
            }
          }
        } else {
          setSubmitError(problem.detail ?? problem.title ?? `Error (${response.status}).`);
        }
      } else {
        initialStateRef.current = {
          ...state,
          slugManuallyEdited: mode === 'edit',
        };
        const newSlug = state.slug;
        const toastKey = mode === 'create' ? 'created' : 'updated';
        window.location.assign(`/admin/contributions?toast=${toastKey}&slug=${encodeURIComponent(newSlug)}`);
        return;
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitError('Error de red. Verificá que el backend esté corriendo.');
    }
    setSubmitting(false);
  }

  function onSlugChange(value: string) {
    setState((s) => ({ ...s, slug: value, slugManuallyEdited: true }));
  }

  function markTouched(name: string) {
    setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
  }

  const handleCancel = useCallback(
    (e?: MouseEvent) => {
      if (e) e.preventDefault();
      if (isDirty) {
        setConfirmDiscard(true);
        return;
      }
      window.location.href = '/admin/contributions';
    },
    [isDirty],
  );

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="title" className="field__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="eyebrow__line" aria-hidden="true"></span>
            Título
          </span>
          <span
            className="field__label-hint"
            data-over={state.title.length > TITLE_MAX}
          >
            {state.title.length} / {TITLE_MAX}
          </span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          className="field__input"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
          onBlur={() => markTouched('title')}
          maxLength={TITLE_MAX}
          required
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          autoFocus
        />
        {errors.title && (
          <p id="title-error" className="field__error">{errors.title}</p>
        )}
      </div>

      <div className="field">
        <label htmlFor="slug" className="field__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="eyebrow__line" aria-hidden="true"></span>
            Slug
          </span>
          <span
            className={
              'field__slug-flag' +
              (state.slugManuallyEdited ? ' field__slug-flag--manual' : '')
            }
            title={
              state.slugManuallyEdited
                ? 'Editaste el slug a mano'
                : 'Se genera automáticamente desde el título'
            }
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {state.slugManuallyEdited ? (
                <path d="M12 20h9"></path>
              ) : (
                <path d="M12 2v4M12 22v-4M2 12h4M22 12h-4"></path>
              )}
              <circle cx="12" cy="12" r="4"></circle>
            </svg>
            <span>{state.slugManuallyEdited ? 'Editado manualmente' : 'Auto-generado'}</span>
          </span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          className="field__input field__input--mono"
          value={state.slug}
          onChange={(e) => onSlugChange(e.target.value)}
          onBlur={() => markTouched('slug')}
          maxLength={SLUG_MAX}
          required
          spellCheck={false}
          aria-invalid={!!errors.slug}
          aria-describedby={errors.slug ? 'slug-error' : 'slug-hint'}
        />
        <p id="slug-hint" className="field__hint">
          <span>
            Vista previa: <code>/contributions/{state.slug || 'tu-slug'}</code>
          </span>
          <span>{state.slug.length} / {SLUG_MAX}</span>
        </p>
        {errors.slug && <p id="slug-error" className="field__error">{errors.slug}</p>}
        {slugChanged && (
          <p className="field__warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Cambiar el slug rompe la URL anterior. La contribución se va a mover a{' '}
            <code>/contributions/{state.slug}</code>. Planificá tus redirects.</span>
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="urlThumbnail" className="field__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="eyebrow__line" aria-hidden="true"></span>
            URL del thumbnail
          </span>
          <span
            className="field__label-hint"
            data-over={state.urlThumbnail.length > URL_MAX}
          >
            {state.urlThumbnail.length} / {URL_MAX}
          </span>
        </label>
        <input
          id="urlThumbnail"
          name="urlThumbnail"
          type="url"
          className="field__input"
          value={state.urlThumbnail}
          onChange={(e) => setState((s) => ({ ...s, urlThumbnail: e.target.value }))}
          onBlur={() => markTouched('urlThumbnail')}
          maxLength={URL_MAX}
          required
          placeholder="https://ejemplo.com/thumb.png"
          aria-invalid={!!errors.urlThumbnail}
          aria-describedby={
            errors.urlThumbnail
              ? 'urlThumbnail-error'
              : state.urlThumbnail
              ? 'urlThumbnail-preview'
              : undefined
          }
        />
        {errors.urlThumbnail && (
          <p id="urlThumbnail-error" className="field__error">{errors.urlThumbnail}</p>
        )}
        {state.urlThumbnail && !errors.urlThumbnail && (
          <img
            id="urlThumbnail-preview"
            src={state.urlThumbnail}
            alt=""
            className="field__thumb-preview"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="field">
        <label htmlFor="urlPrContribution" className="field__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="eyebrow__line" aria-hidden="true"></span>
            URL de la contribución
          </span>
          <span
            className="field__label-hint"
            data-over={state.urlPrContribution.length > URL_MAX}
          >
            {state.urlPrContribution.length} / {URL_MAX}
          </span>
        </label>
        <input
          id="urlPrContribution"
          name="urlPrContribution"
          type="url"
          className="field__input"
          value={state.urlPrContribution}
          onChange={(e) => setState((s) => ({ ...s, urlPrContribution: e.target.value }))}
          onBlur={() => markTouched('urlPrContribution')}
          maxLength={URL_MAX}
          required
          placeholder="https://github.com/usuario/repo/pull/123"
          aria-invalid={!!errors.urlPrContribution}
          aria-describedby={
            errors.urlPrContribution ? 'urlPrContribution-error' : 'urlPrContribution-hint'
          }
        />
        {errors.urlPrContribution && (
          <p id="urlPrContribution-error" className="field__error">
            {errors.urlPrContribution}
          </p>
        )}
        {!errors.urlPrContribution && (
          <p id="urlPrContribution-hint" className="field__hint">
            Link al PR, artículo o recurso externo.
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="description" className="field__label">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="eyebrow__line" aria-hidden="true"></span>
            Descripción
          </span>
          <span
            className="field__label-hint"
            data-over={state.description.length > DESCRIPTION_MAX}
          >
            {state.description.length} / {DESCRIPTION_MAX}
          </span>
        </label>
        <textarea
          id="description"
          name="description"
          className="field__textarea"
          value={state.description}
          onChange={(e) => setState((s) => ({ ...s, description: e.target.value }))}
          onBlur={() => markTouched('description')}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          required
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && (
          <p id="description-error" className="field__error">{errors.description}</p>
        )}
      </div>

      <div className="field">
        <div className="field__tabs" role="tablist" aria-label="Modo de edición del contenido">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'edit'}
            className={'field__tab' + (tab === 'edit' ? ' is-active' : '')}
            onClick={() => setTab('edit')}
          >
            Contenido
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            className={'field__tab' + (tab === 'preview' ? ' is-active' : '')}
            onClick={() => setTab('preview')}
          >
            Vista previa
          </button>
          <span className="field__label-hint" style={{ marginLeft: 'auto' }}>
            {state.content.length} caracteres
          </span>
        </div>

        {tab === 'edit' ? (
          <textarea
            id="content"
            name="content"
            className="field__textarea field__textarea--content"
            value={state.content}
            onChange={(e) => setState((s) => ({ ...s, content: e.target.value }))}
            onBlur={() => markTouched('content')}
            rows={16}
            required
            aria-invalid={!!errors.content}
            aria-describedby={errors.content ? 'content-error' : 'content-hint'}
          />
        ) : (
          <div className="field__preview" aria-live="polite">
            {previewHtml ? (
              <div className="prose" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            ) : (
              <p className="field__preview-empty">
                Empezá a escribir en la pestaña "Contenido" para ver la vista previa.
              </p>
            )}
          </div>
        )}

        {errors.content && tab === 'edit' && (
          <p id="content-error" className="field__error">{errors.content}</p>
        )}
        {tab === 'edit' && (
          <p id="content-hint" className="field__hint">
            Markdown soportado. La sanitización se hace en el frontend.
          </p>
        )}
      </div>

      {submitError && (
        <p className="field__submit-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>{submitError}</span>
        </p>
      )}

      <div className="field-actions">
        <button type="button" onClick={handleCancel} className="btn-cancel">
          Cancelar
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={!isValid || submitting}
          aria-busy={submitting}
        >
          {submitting && <span className="btn-primary__spinner" aria-hidden="true"></span>}
          <span>
            {submitting
              ? mode === 'create'
                ? 'Creando…'
                : 'Guardando…'
              : mode === 'create'
              ? 'Crear contribución'
              : 'Guardar cambios'}
          </span>
        </button>
      </div>

      {confirmDiscard && (
        <div className="discard-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title">
          <div className="discard-dialog__backdrop" onClick={() => setConfirmDiscard(false)}></div>
          <div className="discard-dialog__panel">
            <h3 id="discard-title" className="discard-dialog__title">¿Descartar cambios?</h3>
            <p className="discard-dialog__body">
              Vas a perder los cambios que hiciste en esta contribución.
            </p>
            <div className="discard-dialog__actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setConfirmDiscard(false)}
              >
                Seguir editando
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  setConfirmDiscard(false);
                  initialStateRef.current = state;
                  window.location.href = '/admin/contributions';
                }}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
