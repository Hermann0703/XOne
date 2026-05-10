'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  HardDrive,
  Layers,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStorageStore, type Cabinet, type Box } from './store';

// ─── 档案盒状态映射 ─────────────────────────────────

const BOX_STATUS_MAP: Record<
  string,
  { label: string; variant: 'success' | 'default' | 'secondary' }
> = {
  empty: { label: '空闲', variant: 'secondary' },
  partial: { label: '部分', variant: 'default' },
  full: { label: '已满', variant: 'success' },
};

function BoxStatusBadge({ status }: { status: string }) {
  const t = useTranslations('storage.boxStatus');
  const variant = BOX_STATUS_MAP[status]?.variant || 'default';
  const label = t(status) || BOX_STATUS_MAP[status]?.label || status;
  return <Badge variant={variant}>{label}</Badge>;
}

// ─── KPI 卡片 ────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}

function KpiCard({ label, value, icon: Icon }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 主组件 ──────────────────────────────────────────

export default function StorageDashboard() {
  const t = useTranslations();
  const {
    cabinets,
    boxes,
    stats,
    loading,
    selectedCabinetId,
    fetchCabinets,
    createCabinet,
    updateCabinet,
    deleteCabinet,
    fetchBoxes,
    createBox,
    deleteBox,
    fetchStats,
    selectCabinet,
  } = useStorageStore();

  // 搜索
  const [search, setSearch] = useState('');

  // 档案柜创建/编辑弹窗
  const [cabinetDialogOpen, setCabinetDialogOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState<Cabinet | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formFloor, setFormFloor] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [savingCabinet, setSavingCabinet] = useState(false);

  // 档案柜删除确认
  const [deleteCabinetTarget, setDeleteCabinetTarget] = useState<Cabinet | null>(null);
  const [deletingCabinet, setDeletingCabinet] = useState(false);

  // 档案盒创建弹窗
  const [boxDialogOpen, setBoxDialogOpen] = useState(false);
  const [formBoxNo, setFormBoxNo] = useState('');
  const [formBoxRow, setFormBoxRow] = useState('');
  const [formBoxCol, setFormBoxCol] = useState('');
  const [formBoxLayer, setFormBoxLayer] = useState('');
  const [formBoxBarcode, setFormBoxBarcode] = useState('');
  const [formBoxStatus, setFormBoxStatus] = useState('empty');
  const [formBoxDesc, setFormBoxDesc] = useState('');
  const [savingBox, setSavingBox] = useState(false);

  // 档案盒删除确认
  const [deleteBoxTarget, setDeleteBoxTarget] = useState<Box | null>(null);
  const [deletingBox, setDeletingBox] = useState(false);

  // ── 数据加载 ──

  const loadData = useCallback(() => {
    fetchCabinets({ search: search || undefined });
    fetchStats();
  }, [search, fetchCabinets, fetchStats]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 选中档案柜时加载对应的档案盒
  useEffect(() => {
    if (selectedCabinetId) {
      fetchBoxes(selectedCabinetId);
    }
  }, [selectedCabinetId, fetchBoxes]);

  // ── 档案柜弹窗 ──

  const openCreateCabinet = () => {
    setEditingCabinet(null);
    setFormName('');
    setFormCode('');
    setFormLocation('');
    setFormFloor('');
    setFormRoom('');
    setFormDesc('');
    setCabinetDialogOpen(true);
  };

  const openEditCabinet = (cabinet: Cabinet) => {
    setEditingCabinet(cabinet);
    setFormName(cabinet.name);
    setFormCode(cabinet.code);
    setFormLocation(cabinet.location);
    setFormFloor(cabinet.floor || '');
    setFormRoom(cabinet.room || '');
    setFormDesc(cabinet.description || '');
    setCabinetDialogOpen(true);
  };

  const handleSaveCabinet = async () => {
    if (!formName.trim() || !formCode.trim() || !formLocation.trim()) return;
    setSavingCabinet(true);

    const data: Partial<Cabinet> = {
      name: formName.trim(),
      code: formCode.trim(),
      location: formLocation.trim(),
    };
    if (formFloor) data.floor = formFloor.trim();
    if (formRoom) data.room = formRoom.trim();
    if (formDesc) data.description = formDesc.trim();

    if (editingCabinet) {
      await updateCabinet(editingCabinet.id, data);
    } else {
      await createCabinet(data);
    }

    setSavingCabinet(false);
    setCabinetDialogOpen(false);
    loadData();
  };

  const handleDeleteCabinet = async () => {
    if (!deleteCabinetTarget) return;
    setDeletingCabinet(true);
    const ok = await deleteCabinet(deleteCabinetTarget.id);
    setDeletingCabinet(false);
    if (ok) {
      setDeleteCabinetTarget(null);
      loadData();
    }
  };

  // ── 档案盒弹窗 ──

  const openCreateBox = () => {
    setFormBoxNo('');
    setFormBoxRow('');
    setFormBoxCol('');
    setFormBoxLayer('');
    setFormBoxBarcode('');
    setFormBoxStatus('empty');
    setFormBoxDesc('');
    setBoxDialogOpen(true);
  };

  const handleSaveBox = async () => {
    if (!formBoxNo.trim() || !selectedCabinetId) return;
    setSavingBox(true);

    const data: Partial<Box> = {
      box_no: formBoxNo.trim(),
      status: formBoxStatus,
    };
    if (formBoxRow) data.row = formBoxRow.trim();
    if (formBoxCol) data.col = formBoxCol.trim();
    if (formBoxLayer) data.layer = formBoxLayer.trim();
    if (formBoxBarcode) data.barcode = formBoxBarcode.trim();
    if (formBoxDesc) data.description = formBoxDesc.trim();

    await createBox(selectedCabinetId, data);

    setSavingBox(false);
    setBoxDialogOpen(false);
    if (selectedCabinetId) {
      fetchBoxes(selectedCabinetId);
    }
    fetchStats();
  };

  const handleDeleteBox = async () => {
    if (!deleteBoxTarget || !selectedCabinetId) return;
    setDeletingBox(true);
    const ok = await deleteBox(selectedCabinetId, deleteBoxTarget.id);
    setDeletingBox(false);
    if (ok) {
      setDeleteBoxTarget(null);
      fetchBoxes(selectedCabinetId);
      fetchStats();
    }
  };

  // ── 渲染 ──

  return (
    <div className="space-y-6 p-6">
      {/* ── KPI 统计卡片 ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t('storage.stats.totalCabinets')}
          value={stats?.total_cabinets ?? 0}
          icon={HardDrive}
        />
        <KpiCard
          label={t('storage.stats.totalBoxes')}
          value={stats?.total_boxes ?? 0}
          icon={Package}
        />
        <KpiCard
          label={t('storage.stats.emptyBoxes')}
          value={stats?.empty_boxes ?? 0}
          icon={Layers}
        />
        <KpiCard
          label={t('storage.stats.partialBoxes')}
          value={stats?.partial_boxes ?? 0}
          icon={Layers}
        />
        <KpiCard
          label={t('storage.stats.fullBoxes')}
          value={stats?.full_boxes ?? 0}
          icon={Package}
        />
      </div>

      {/* ── 档案柜管理 ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('storage.cabinets.title')}</CardTitle>
            <Button onClick={openCreateCabinet}>
              <Plus className="size-4 mr-1" />
              {t('storage.cabinets.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 搜索 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-secondary" />
            <Input
              placeholder={t('storage.cabinets.searchPlaceholder')}
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 档案柜表格 */}
          {loading && cabinets.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">ID</TableHead>
                  <TableHead>{t('storage.cabinets.name')}</TableHead>
                  <TableHead>{t('storage.cabinets.code')}</TableHead>
                  <TableHead>{t('storage.cabinets.location')}</TableHead>
                  <TableHead className="w-[100px]">{t('storage.cabinets.boxCount')}</TableHead>
                  <TableHead className="w-[120px]">{t('storage.cabinets.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cabinets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-text-secondary py-10">
                      {t('common.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  cabinets.map((c) => (
                    <TableRow
                      key={c.id}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedCabinetId === c.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() =>
                        selectCabinet(selectedCabinetId === c.id ? null : c.id)
                      }
                    >
                      <TableCell className="text-sm text-text-secondary">{c.id}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm font-mono">{c.code}</TableCell>
                      <TableCell className="text-sm">{c.location}</TableCell>
                      <TableCell className="text-sm">
                        {c.box_count !== undefined ? c.box_count : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title={t('common.edit')}
                            onClick={() => openEditCabinet(c)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title={t('common.delete')}
                            onClick={() => setDeleteCabinetTarget(c)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── 档案盒列表（选中档案柜时显示） ── */}
      {selectedCabinetId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {t('storage.boxes.title')}
                <span className="ml-2 text-sm font-normal text-text-secondary">
                  #{selectedCabinetId}
                </span>
              </CardTitle>
              <Button onClick={openCreateBox}>
                <Plus className="size-4 mr-1" />
                {t('storage.boxes.add')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && boxes.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full rounded" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>{t('storage.boxes.boxNo')}</TableHead>
                    <TableHead>{t('storage.boxes.row')}</TableHead>
                    <TableHead>{t('storage.boxes.col')}</TableHead>
                    <TableHead>{t('storage.boxes.layer')}</TableHead>
                    <TableHead>{t('storage.boxes.barcode')}</TableHead>
                    <TableHead className="w-[100px]">{t('storage.boxes.status')}</TableHead>
                    <TableHead className="w-[80px]">{t('storage.boxes.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boxes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-text-secondary py-8">
                        {t('common.empty')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    boxes.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="text-sm text-text-secondary">{b.id}</TableCell>
                        <TableCell className="font-medium font-mono">{b.box_no}</TableCell>
                        <TableCell className="text-sm">{b.row || '-'}</TableCell>
                        <TableCell className="text-sm">{b.col || '-'}</TableCell>
                        <TableCell className="text-sm">{b.layer || '-'}</TableCell>
                        <TableCell className="text-sm font-mono">{b.barcode || '-'}</TableCell>
                        <TableCell>
                          <BoxStatusBadge status={b.status} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title={t('common.delete')}
                            onClick={() => setDeleteBoxTarget(b)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 档案柜创建/编辑弹窗 ── */}
      <Dialog
        open={cabinetDialogOpen}
        onOpenChange={(open) => {
          if (!open) setCabinetDialogOpen(false);
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {editingCabinet ? t('storage.cabinets.edit') : t('storage.cabinets.add')}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.cabinets.name')} *
              </label>
              <Input
                placeholder={t('storage.cabinets.namePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.cabinets.code')} *
              </label>
              <Input
                placeholder={t('storage.cabinets.codePlaceholder')}
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.cabinets.location')} *
              </label>
              <Input
                placeholder={t('storage.cabinets.locationPlaceholder')}
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('storage.cabinets.floor')}
                </label>
                <Input
                  placeholder={t('storage.cabinets.floorPlaceholder')}
                  value={formFloor}
                  onChange={(e) => setFormFloor(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('storage.cabinets.room')}
                </label>
                <Input
                  placeholder={t('storage.cabinets.roomPlaceholder')}
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.cabinets.description')}
              </label>
              <Input
                placeholder={t('storage.cabinets.descriptionPlaceholder')}
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCabinetDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveCabinet}
            disabled={savingCabinet || !formName.trim() || !formCode.trim() || !formLocation.trim()}
          >
            {savingCabinet
              ? t('common.saving')
              : editingCabinet
                ? t('common.save')
                : t('common.add')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── 档案柜删除确认弹窗 ── */}
      <Dialog
        open={!!deleteCabinetTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteCabinetTarget(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('storage.cabinets.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-text-secondary">
            {t('storage.cabinets.deleteConfirm', {
              name: deleteCabinetTarget?.name || '',
            })}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteCabinetTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDeleteCabinet} disabled={deletingCabinet}>
            {deletingCabinet ? t('common.deleting') : t('common.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── 档案盒创建弹窗 ── */}
      <Dialog
        open={boxDialogOpen}
        onOpenChange={(open) => {
          if (!open) setBoxDialogOpen(false);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('storage.boxes.add')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.boxes.boxNo')} *
              </label>
              <Input
                placeholder={t('storage.boxes.boxNoPlaceholder')}
                value={formBoxNo}
                onChange={(e) => setFormBoxNo(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('storage.boxes.row')}
                </label>
                <Input
                  placeholder={t('storage.boxes.rowPlaceholder')}
                  value={formBoxRow}
                  onChange={(e) => setFormBoxRow(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('storage.boxes.col')}
                </label>
                <Input
                  placeholder={t('storage.boxes.colPlaceholder')}
                  value={formBoxCol}
                  onChange={(e) => setFormBoxCol(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('storage.boxes.layer')}
                </label>
                <Input
                  placeholder={t('storage.boxes.layerPlaceholder')}
                  value={formBoxLayer}
                  onChange={(e) => setFormBoxLayer(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.boxes.barcode')}
              </label>
              <Input
                placeholder={t('storage.boxes.barcodePlaceholder')}
                value={formBoxBarcode}
                onChange={(e) => setFormBoxBarcode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.boxes.status')}
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formBoxStatus}
                onChange={(e) => setFormBoxStatus(e.target.value)}
              >
                <option value="empty">{t('storage.boxStatus.empty')}</option>
                <option value="partial">{t('storage.boxStatus.partial')}</option>
                <option value="full">{t('storage.boxStatus.full')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {t('storage.boxes.description')}
              </label>
              <Input
                placeholder={t('storage.boxes.descriptionPlaceholder')}
                value={formBoxDesc}
                onChange={(e) => setFormBoxDesc(e.target.value)}
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBoxDialogOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSaveBox}
            disabled={savingBox || !formBoxNo.trim() || !selectedCabinetId}
          >
            {savingBox ? t('common.saving') : t('common.add')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* ── 档案盒删除确认弹窗 ── */}
      <Dialog
        open={!!deleteBoxTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteBoxTarget(null);
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('storage.boxes.deleteTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-text-secondary">
            {t('storage.boxes.deleteConfirm', {
              boxNo: deleteBoxTarget?.box_no || '',
            })}
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDeleteBoxTarget(null)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleDeleteBox} disabled={deletingBox}>
            {deletingBox ? t('common.deleting') : t('common.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
