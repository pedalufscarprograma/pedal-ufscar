import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';

import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

import {
  Bike,
  Download,
  Edit,
  ImageIcon,
  PlusCircle,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Upload,
  X,
} from 'lucide-react';

import { api } from '../api/api';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { exportToCsv } from '../utils/exportCsv';

interface Equipment {
  id: string;
  type: string;
  code: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  status: string;
  notes: string | null;

  isPublished: boolean;
}

export default function EquipmentsPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [selectedEquipment, setSelectedEquipment] =
    useState<Equipment | null>(null);

  const [selectedPhotoUrl, setSelectedPhotoUrl] =
    useState<string | null>(null);

  const [editingEquipment, setEditingEquipment] =
    useState<Equipment | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [type, setType] = useState('bike');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [editType, setEditType] = useState('bike');
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('available');

  async function loadEquipments() {
    try {
      setLoading(true);

      const response = await api.get('/equipments');

      setEquipments(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar equipamentos.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function uploadEquipmentImage(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.warning('Selecione apenas arquivos de imagem.');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/equipments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.photoUrl as string;
  }

  async function handleUploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);

      const uploadedPhotoUrl = await uploadEquipmentImage(file);

      if (uploadedPhotoUrl) {
        setPhotoUrl(uploadedPhotoUrl);
        toast.success('Imagem carregada com sucesso!');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar imagem.',
      );
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  }

  async function handleUploadEditImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingImage(true);

      const uploadedPhotoUrl = await uploadEquipmentImage(file);

      if (uploadedPhotoUrl) {
        setEditPhotoUrl(uploadedPhotoUrl);
        toast.success('Imagem carregada com sucesso!');
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao carregar imagem.',
      );
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  }

  async function handleCreateEquipment(event: FormEvent) {
    event.preventDefault();

    try {
      await api.post('/equipments', {
        type,
        code,
        name,
        photoUrl,
        description,
        notes,
      });

      setCode('');
      setName('');
      setPhotoUrl('');
      setDescription('');
      setNotes('');
      setType('bike');

      await loadEquipments();

      toast.success('Equipamento cadastrado com sucesso!');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao cadastrar equipamento.',
      );
    }
  }

  function openEditModal(equipment: Equipment) {
    setEditingEquipment(equipment);
    setEditType(equipment.type);
    setEditCode(equipment.code);
    setEditName(equipment.name);
    setEditPhotoUrl(equipment.photoUrl || '');
    setEditDescription(equipment.description || '');
    setEditNotes(equipment.notes || '');
    setEditStatus(equipment.status);
  }

  function closeEditModal() {
    setEditingEquipment(null);
    setEditType('bike');
    setEditCode('');
    setEditName('');
    setEditPhotoUrl('');
    setEditDescription('');
    setEditNotes('');
    setEditStatus('available');
  }

  async function handleUpdateEquipment(event: FormEvent) {
    event.preventDefault();

    if (!editingEquipment) return;

    try {
      setSavingEdit(true);

      await api.patch(`/equipments/${editingEquipment.id}`, {
        type: editType,
        code: editCode,
        name: editName,
        photoUrl: editPhotoUrl,
        description: editDescription,
        notes: editNotes,
      });

      if (editStatus !== editingEquipment.status) {
        await api.patch(`/equipments/${editingEquipment.id}/status`, {
          status: editStatus,
        });
      }

      await loadEquipments();

      closeEditModal();

      toast.success('Equipamento atualizado com sucesso!');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao atualizar equipamento.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function publishEquipment(id: string) {
    try {
      await api.patch(`/equipments/${id}/publish`);

      toast.success(
        'Bicicleta publicada com sucesso!',
      );

      await loadEquipments();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao publicar bicicleta.',
      );
    }
  }

  async function unpublishEquipment(id: string) {
    try {
      await api.patch(`/equipments/${id}/unpublish`);

      toast.success(
        'Publicação cancelada com sucesso!',
      );

      await loadEquipments();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Erro ao cancelar publicação.',
      );
    }
  }

  const filteredEquipments = useMemo(() => {
    return equipments.filter((equipment) => {
      const searchText = `${equipment.code} ${equipment.name} ${
        equipment.description || ''
      } ${equipment.notes || ''}`.toLowerCase();

      const matchesSearch = searchText.includes(search.toLowerCase());

      const matchesType =
        typeFilter === 'all' || equipment.type === typeFilter;

      const matchesStatus =
        statusFilter === 'all' || equipment.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [equipments, search, typeFilter, statusFilter]);

  function getQrValue(equipment: Equipment) {
    return `${window.location.origin}/public/equipment/${equipment.id}`;
  }

  function openQrModal(equipment: Equipment) {
    setSelectedEquipment(equipment);
  }

  function closeQrModal() {
    setSelectedEquipment(null);
  }

  function handleDownloadQrCode() {
    if (!selectedEquipment) return;

    const canvas = document.getElementById(
      'equipment-qr-code',
    ) as HTMLCanvasElement | null;

    if (!canvas) {
      toast.error('QR Code não encontrado.');
      return;
    }

    const image = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.href = image;
    link.download = `qr-${selectedEquipment.code}.png`;
    link.click();
  }

  function handleExportEquipments() {
    exportToCsv(
      'equipamentos-pedal-ufscar.csv',
      filteredEquipments.map((equipment) => ({
        Código: equipment.code,
        Nome: equipment.name,
        Tipo: translateType(equipment.type),
        Status: translateStatus(equipment.status),
        Foto: equipment.photoUrl || '',
        Descrição: equipment.description || '',
        Observações: equipment.notes || '',
        QRCode: getQrValue(equipment),
      })),
    );
  }

  useEffect(() => {
    loadEquipments();
  }, []);

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-600 text-white shadow-lg shadow-green-950/20">
              <Bike size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Equipamentos
              </h1>

              <p className="mt-1 text-slate-500">
                Cadastre, edite e acompanhe bicicletas, capacetes, travas e chaves.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleExportEquipments}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-slate-800"
            >
              <Download size={18} />
              Exportar CSV
            </button>

            <button
              onClick={loadEquipments}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        <form
          onSubmit={handleCreateEquipment}
          className="mb-8 rounded-3xl bg-white p-6 shadow-lg shadow-slate-200/60"
        >
          <div className="mb-6 flex items-center gap-3">
            <PlusCircle className="text-green-600" size={24} />

            <h2 className="text-xl font-black text-slate-900">
              Novo equipamento
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Tipo
              </span>

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="bike">Bicicleta</option>
                <option value="helmet">Capacete</option>
                <option value="lock">Trava</option>
                <option value="key">Chave</option>
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Código
              </span>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: BIKE-001"
                required
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Nome
              </span>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Bicicleta 001"
                required
                className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Foto do equipamento
              </span>

              <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <Upload size={18} />

                {uploadingImage ? 'Carregando imagem...' : 'Escolher imagem'}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>

              {photoUrl && (
                <p className="break-all text-xs font-semibold text-green-700">
                  Imagem carregada com sucesso.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
              {photoUrl ? (
                <button
                  type="button"
                  onClick={() => setSelectedPhotoUrl(photoUrl)}
                  className="block w-full"
                >
                  <img
                    src={photoUrl}
                    alt="Pré-visualização"
                    className="h-36 w-full rounded-xl object-cover"
                  />
                </button>
              ) : (
                <div className="flex h-36 flex-col items-center justify-center text-slate-400">
                  <ImageIcon size={32} />
                  <p className="mt-2 text-sm font-semibold">
                    Pré-visualização da foto
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Descrição
              </span>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do equipamento"
                className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-bold text-slate-700">
                Observações
              </span>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações internas"
                className="min-h-24 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={uploadingImage}
            className="mt-6 rounded-xl bg-green-600 px-6 py-3 font-black text-white shadow-lg shadow-green-950/20 transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cadastrar equipamento
          </button>
        </form>

        <div className="mb-6 grid gap-4 rounded-3xl bg-white p-5 shadow-lg shadow-slate-200/60 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por código, nome ou descrição..."
              className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todos os tipos</option>
            <option value="bike">Bicicletas</option>
            <option value="helmet">Capacetes</option>
            <option value="lock">Travas</option>
            <option value="key">Chaves</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="all">Todos os status</option>
            <option value="available">Disponíveis</option>
            <option value="loaned">Emprestados</option>
            <option value="maintenance">Manutenção</option>
            <option value="lost">Perdidos</option>
            <option value="damaged">Danificados</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-slate-200/60">
          {loading ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Carregando equipamentos...
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="p-8 text-center font-semibold text-slate-500">
              Nenhum equipamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Foto
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Código
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Nome
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Tipo
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Publicação
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Descrição
                    </th>

                    <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEquipments.map((equipment) => (
                    <tr
                      key={equipment.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        {equipment.photoUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPhotoUrl(equipment.photoUrl)
                            }
                          >
                            <img
                              src={equipment.photoUrl}
                              alt={equipment.name}
                              className="h-14 w-20 rounded-xl object-cover transition hover:scale-105"
                            />
                          </button>
                        ) : (
                          <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                            <ImageIcon size={22} />
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                          {equipment.code}
                        </span>
                      </td>

                      <td className="px-6 py-5 font-bold text-slate-900">
                        {equipment.name}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {translateType(equipment.type)}
                      </td>

                      <td className="px-6 py-5">
                        <StatusBadge status={equipment.status} />
                      </td>

                      <td className="px-6 py-5">
                        {equipment.type === 'bike' ? (
                          equipment.isPublished ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                              Publicada
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                              Não publicada
                            </span>
                          )
                        ) : (
                          '-'
                        )}
                      </td>

                      <td className="px-6 py-5 text-sm text-slate-600">
                        {equipment.description || 'Sem descrição'}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(equipment)}
                            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700"
                          >
                            <Edit size={16} />
                            Editar
                          </button>

                          {equipment.type === 'bike' &&
                            equipment.status === 'available' && (
                              equipment.isPublished ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    unpublishEquipment(equipment.id)
                                  }
                                  className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
                                >
                                  Cancelar publicação
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    publishEquipment(equipment.id)
                                  }
                                  className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                                >
                                  Publicar
                                </button>
                              )
                            )}

                          <button
                            type="button"
                            onClick={() => openQrModal(equipment)}
                            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                          >
                            <QrCode size={16} />
                            Ver QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editingEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <form
              onSubmit={handleUpdateEquipment}
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Editar equipamento
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Atualize os dados, foto e status do equipamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Tipo
                  </span>

                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="bike">Bicicleta</option>
                    <option value="helmet">Capacete</option>
                    <option value="lock">Trava</option>
                    <option value="key">Chave</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Status
                  </span>

                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="available">Disponível</option>
                    <option value="loaned">Emprestado</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="lost">Perdido</option>
                    <option value="damaged">Danificado</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Código
                  </span>

                  <input
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    required
                    className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Nome
                  </span>

                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="h-12 rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Foto do equipamento
                  </span>

                  <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                    <Upload size={18} />

                    {uploadingImage ? 'Carregando...' : 'Trocar imagem'}

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadEditImage}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  {editPhotoUrl && (
                    <p className="break-all text-xs font-semibold text-green-700">
                      Imagem selecionada.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                  {editPhotoUrl ? (
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoUrl(editPhotoUrl)}
                      className="block w-full"
                    >
                      <img
                        src={editPhotoUrl}
                        alt="Pré-visualização"
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-40 flex-col items-center justify-center text-slate-400">
                      <ImageIcon size={32} />
                      <p className="mt-2 text-sm font-semibold">
                        Sem foto
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Descrição
                  </span>

                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">
                    Observações
                  </span>

                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="min-h-28 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl bg-slate-100 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingEdit || uploadingImage}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} />
                  {savingEdit ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        )}

        {selectedEquipment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
              <div className="mb-5 flex items-start justify-between text-left">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    QR Code
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Cole este QR Code na bicicleta/equipamento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeQrModal}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <p className="font-black text-slate-900">
                  {selectedEquipment.code}
                </p>

                <p className="text-sm text-slate-500">
                  {selectedEquipment.name}
                </p>
              </div>

              <div className="mx-auto inline-block rounded-2xl border border-slate-200 bg-white p-4">
                <QRCodeCanvas
                  id="equipment-qr-code"
                  value={getQrValue(selectedEquipment)}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>

              <button
                type="button"
                onClick={handleDownloadQrCode}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700"
              >
                <Download size={18} />
                Baixar QR Code
              </button>
            </div>
          </div>
        )}

        {selectedPhotoUrl && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4">
            <div className="relative max-h-[90vh] max-w-5xl">
              <button
                type="button"
                onClick={() => setSelectedPhotoUrl(null)}
                className="absolute -right-3 -top-3 rounded-full bg-white p-2 text-slate-700 shadow-lg transition hover:bg-slate-100"
              >
                <X size={22} />
              </button>

              <img
                src={selectedPhotoUrl}
                alt="Foto ampliada"
                className="max-h-[90vh] max-w-full rounded-3xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    loaned: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-amber-100 text-amber-700',
    lost: 'bg-red-100 text-red-700',
    damaged: 'bg-orange-100 text-orange-700',
    inactive: 'bg-slate-200 text-slate-700',
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        classes[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {translateStatus(status)}
    </span>
  );
}

function translateType(type: string) {
  const map: Record<string, string> = {
    bike: 'Bicicleta',
    helmet: 'Capacete',
    lock: 'Trava',
    key: 'Chave',
  };

  return map[type] || type;
}

function translateStatus(status: string) {
  const map: Record<string, string> = {
    available: 'Disponível',
    loaned: 'Emprestado',
    maintenance: 'Manutenção',
    lost: 'Perdido',
    damaged: 'Danificado',
    inactive: 'Inativo',
  };

  return map[status] || status;
}