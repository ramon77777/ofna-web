'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCcw,
  Save,
  Send,
  UploadCloud,
} from 'lucide-react';

import { api } from '@/lib/api';
import { PartnerDocument, PartnerProfile } from '@/lib/types';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'carte_identite', label: 'Carte d’identité' },
  { value: 'passeport', label: 'Passeport' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'document_legal', label: 'Document légal' },
];

interface PartnerDocumentsManagerProps {
  initialDocuments: PartnerDocument[];
  onProfileUpdated?: (profile: PartnerProfile) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDocumentLabel(type: string | null | undefined) {
  const labels: Record<string, string> = {
    carte_identite: 'Carte d’identité',
    passeport: 'Passeport',
    assurance: 'Assurance',
    document_legal: 'Document légal',
  };

  return labels[String(type ?? '')] ?? type ?? 'Document';
}

function getDocumentStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    soumis: 'Soumis',
    valide: 'Validé',
    rejete: 'Rejeté',
    a_reprendre: 'À reprendre',
  };

  return labels[String(status ?? '')] ?? status ?? 'Non défini';
}

function getDocumentStatusClasses(status: string | null | undefined) {
  const normalized = String(status ?? '').toLowerCase();

  if (normalized === 'valide') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (normalized === 'a_reprendre' || normalized === 'soumis') {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized === 'rejete') {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function getFileName(file: File | null) {
  if (!file) return 'Aucun fichier sélectionné';

  return file.name;
}

function getDocumentFileUrl(fileUrl: string | null | undefined) {
  if (!fileUrl) return '#';

  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '') ??
    'http://localhost:3000';

  return `${apiBaseUrl}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
}

function validateSelectedFile(file: File | null): string | null {
  if (!file) {
    return 'Veuillez choisir un fichier.';
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return 'Format non autorisé. Utilisez PDF, JPG, PNG ou WEBP.';
  }

  const maxSizeInBytes = 5 * 1024 * 1024;

  if (file.size > maxSizeInBytes) {
    return 'Le fichier est trop lourd. Taille maximale autorisée : 5 Mo.';
  }

  return null;
}

async function createDocumentWithFile(
  documentType: string,
  file: File,
): Promise<PartnerDocument> {
  const formData = new FormData();

  formData.append('documentType', documentType);
  formData.append('file', file);

  const response = await api.post<PartnerDocument>(
    '/partner-documents/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

async function replaceDocumentWithFile({
  documentId,
  documentType,
  file,
}: {
  documentId: string;
  documentType: string;
  file: File;
}): Promise<PartnerDocument> {
  const formData = new FormData();

  formData.append('documentType', documentType);
  formData.append('file', file);

  const response = await api.patch<PartnerDocument>(
    `/partner-documents/${documentId}/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export default function PartnerDocumentsManager({
  initialDocuments,
  onProfileUpdated,
}: PartnerDocumentsManagerProps) {
  const [documents, setDocuments] = useState<PartnerDocument[]>(initialDocuments);

  const [documentType, setDocumentType] = useState('carte_identite');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(
    null,
  );
  const [editingDocumentType, setEditingDocumentType] =
    useState('carte_identite');
  const [editingSelectedFile, setEditingSelectedFile] = useState<File | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDocuments(initialDocuments);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [initialDocuments]);

  const hasDocumentsToRedo = useMemo(() => {
    return documents.some(
      (document) => document.documentStatus === 'a_reprendre',
    );
  }, [documents]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const handleEditingFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    setEditingSelectedFile(file);
    setError(null);
    setSuccess(null);
  };

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.get<PartnerDocument[]>('/partner-documents/me');
      setDocuments(response.data);
    } catch {
      setError('Impossible de charger vos documents.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fileValidationError = validateSelectedFile(selectedFile);

    if (fileValidationError) {
      setError(fileValidationError);
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const createdDocument = await createDocumentWithFile(
        documentType,
        selectedFile as File,
      );

      setDocuments((current) => [createdDocument, ...current]);
      setSelectedFile(null);
      setDocumentType('carte_identite');
      setSuccess('Document ajouté avec succès.');
      await loadDocuments();
    } catch {
      setError('Impossible d’ajouter ce document.');
    } finally {
      setCreating(false);
    }
  };

  const startEditing = (document: PartnerDocument) => {
    setEditingDocumentId(document.id);
    setEditingDocumentType(document.documentType);
    setEditingSelectedFile(null);
    setError(null);
    setSuccess(null);
  };

  const cancelEditing = () => {
    setEditingDocumentId(null);
    setEditingDocumentType('carte_identite');
    setEditingSelectedFile(null);
  };

  const handleUpdateDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingDocumentId) return;

    const fileValidationError = validateSelectedFile(editingSelectedFile);

    if (fileValidationError) {
      setError(fileValidationError);
      return;
    }

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedDocument = await replaceDocumentWithFile({
        documentId: editingDocumentId,
        documentType: editingDocumentType,
        file: editingSelectedFile as File,
      });

      setDocuments((current) =>
        current.map((document) =>
          document.id === updatedDocument.id ? updatedDocument : document,
        ),
      );

      cancelEditing();
      setSuccess(
        'Document remplacé avec succès. Il repasse en statut “Soumis” pour vérification.',
      );
      await loadDocuments();
    } catch {
      setError('Impossible de remplacer ce document.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitDocuments = async () => {
    if (documents.length === 0) {
      setError('Ajoutez au moins un document avant de soumettre le dossier.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<PartnerProfile>(
        '/partner-documents/submit',
        {
          note: 'Dossier soumis depuis l’espace partenaire.',
        },
      );

      setSuccess('Votre dossier a été soumis à l’administration.');
      onProfileUpdated?.(response.data);
      await loadDocuments();
    } catch {
      setError('Impossible de soumettre votre dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[32px] border border-[var(--ofna-border)] bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
          <div>
            <h3 className="text-2xl font-black text-[var(--ofna-dark)]">
              Documents partenaire
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ajoutez vos pièces justificatives, remplacez celles demandées par
              l’administration, puis soumettez votre dossier.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmitDocuments}
            disabled={submitting || documents.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Soumission...' : 'Soumettre mon dossier'}
          </button>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        {hasDocumentsToRedo ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-100 p-2 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-bold text-amber-900">
                  Document à reprendre
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-700">
                  Un ou plusieurs documents doivent être remplacés. Consultez le
                  commentaire administrateur avant de renvoyer un nouveau fichier.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form
          onSubmit={handleCreateDocument}
          className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
        >
          <div className="flex items-center gap-2 text-[var(--ofna-green)]">
            <UploadCloud className="h-5 w-5" />
            <h4 className="text-lg font-black text-[var(--ofna-dark)]">
              Ajouter un document
            </h4>
          </div>

          <div className="mt-4 grid gap-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Type de document
              </span>

              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--ofna-green)]"
              >
                {DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Fichier
              </span>

              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-[var(--ofna-green)] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-[var(--ofna-green-dark)] focus:border-[var(--ofna-green)]"
              />

              <p className="mt-2 text-xs font-medium text-slate-500">
                {getFileName(selectedFile)} · Formats acceptés : PDF, JPG, PNG,
                WEBP · Max 5 Mo.
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--ofna-green)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--ofna-green-dark)] disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {creating ? 'Ajout...' : 'Ajouter le document'}
          </button>
        </form>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-600">
            {documents.length} document(s) trouvé(s)
          </p>

          <button
            type="button"
            onClick={loadDocuments}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)] disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-medium text-slate-500">
            Aucun document trouvé pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            {documents.map((document) => {
              const isEditing = editingDocumentId === document.id;

              return (
                <div key={document.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-2xl bg-slate-50 p-2 text-[var(--ofna-green)]">
                        <FileText className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-black text-[var(--ofna-dark)]">
                          {getDocumentLabel(document.documentType)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          Soumis le {formatDate(document.submittedAt)}
                        </p>

                        {document.verifiedAt ? (
                          <p className="mt-1 text-sm text-slate-500">
                            Vérifié le {formatDate(document.verifiedAt)}
                          </p>
                        ) : null}

                        {document.adminComment ? (
                          <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-700">
                            Commentaire admin : {document.adminComment}
                          </p>
                        ) : null}

                        {document.fileUrl ? (
                          <a
                            href={getDocumentFileUrl(document.fileUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex rounded-full border border-[var(--ofna-green)] px-3 py-1 text-xs font-bold text-[var(--ofna-green)] transition hover:bg-[var(--ofna-green-soft)]"
                          >
                            Voir le fichier
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${getDocumentStatusClasses(
                          document.documentStatus,
                        )}`}
                      >
                        {document.documentStatus === 'valide' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : null}
                        {getDocumentStatusLabel(document.documentStatus)}
                      </span>

                      <button
                        type="button"
                        onClick={() => startEditing(document)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 transition hover:border-[var(--ofna-green)] hover:bg-[var(--ofna-green-soft)]"
                      >
                        Remplacer
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <form
                      onSubmit={handleUpdateDocument}
                      className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4"
                    >
                      <p className="text-sm font-bold text-amber-900">
                        Remplacer ce document
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Après remplacement, le document repassera en statut
                        “Soumis” pour une nouvelle vérification.
                      </p>

                      <div className="mt-4 grid gap-4">
                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-amber-900">
                            Type de document
                          </span>

                          <select
                            value={editingDocumentType}
                            onChange={(event) =>
                              setEditingDocumentType(event.target.value)
                            }
                            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-400"
                          >
                            {DOCUMENT_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-semibold text-amber-900">
                            Nouveau fichier
                          </span>

                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                            onChange={handleEditingFileChange}
                            className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none transition file:mr-4 file:rounded-xl file:border-0 file:bg-amber-500 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-amber-600 focus:border-amber-400"
                          />

                          <p className="mt-2 text-xs font-medium text-amber-700">
                            {getFileName(editingSelectedFile)} · Formats acceptés
                            : PDF, JPG, PNG, WEBP · Max 5 Mo.
                          </p>
                        </label>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" />
                          {updating
                            ? 'Remplacement...'
                            : 'Enregistrer le remplacement'}
                        </button>

                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex items-center justify-center rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}