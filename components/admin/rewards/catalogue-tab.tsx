import { listCategories, listProducts, type CategoryRow, type ProductRow } from '@/lib/server/catalogue-admin'
import { ActionForm } from '@/components/admin/action-form'
import { FormDialog } from '@/components/admin/form-dialog'
import { DeleteRecordButton } from '@/components/admin/confirm-action-button'
import { ImageUploadField } from '@/components/admin/image-upload-field'
import { CheckboxInput, FormGrid, SelectInput, TextArea, TextInput } from '@/components/admin/fields'
import { DataTable, EmptyState, fmtNumber, Panel, StatusBadge, Td } from '@/components/admin/ui'
import { saveCategoryAction, saveProductAction } from '@/app/admin/(panel)/panel-actions'

function CategoryFields({ c }: { c?: CategoryRow }) {
  return (
    <>
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <FormGrid>
        <TextInput label="Category name" name="name" required defaultValue={c?.name} placeholder="e.g. Tiles" />
        <TextInput
          label="Short code (optional)"
          name="slug"
          defaultValue={c?.slug ?? ''}
          placeholder="Auto from name"
          hint="Lowercase letters, numbers and dashes."
        />
        <ImageUploadField label="Category image" name="imageUrl" fileName="imageFile" defaultValue={c?.image_url} className="sm:col-span-2" />
        <TextInput label="Display order" name="displayOrder" type="number" min={0} defaultValue={c?.display_order ?? 0} />
      </FormGrid>
      <CheckboxInput label="Show in contractor app" name="status" defaultChecked={c ? c.status === 'active' : true} />
    </>
  )
}

function ProductFields({ p, categories }: { p?: ProductRow; categories: CategoryRow[] }) {
  return (
    <>
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <FormGrid>
        <TextInput label="Product name" name="name" required defaultValue={p?.name} placeholder="e.g. Vitrified Floor Tile 600x600" className="sm:col-span-2" />
        <SelectInput
          label="Category"
          name="categoryId"
          required
          defaultValue={p?.category_id}
          options={categories.map((c) => ({ value: c.id, label: c.status === 'active' ? c.name : `${c.name} (hidden)` }))}
        />
        <TextInput label="Brand" name="brand" defaultValue={p?.brand ?? ''} placeholder="e.g. Kajaria" />
        <TextInput label="Unit" name="unit" defaultValue={p?.unit ?? ''} placeholder="e.g. per box (4 pcs)" />
        <TextInput label="Scheme label (optional)" name="schemeLabel" defaultValue={p?.scheme_label ?? ''} placeholder="e.g. 2x points this month" />
        <TextInput
          label="Reward points per unit (optional)"
          name="rewardPoints"
          type="number"
          min={0}
          step={1}
          defaultValue={p?.reward_points ?? ''}
          placeholder="e.g. 25"
          hint="Shown to contractors and used to fill points when you add a sale of this product."
        />
        <TextArea label="Description" name="description" defaultValue={p?.description ?? ''} className="sm:col-span-2" placeholder="Size, finish, features…" />
        <ImageUploadField label="Product image" name="imageUrl" fileName="imageFile" defaultValue={p?.image_url} className="sm:col-span-2" />
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3 sm:col-span-2">
          <p className="text-sm font-medium text-ink">Tile Visualizer (optional)</p>
          <p className="-mt-2 text-xs text-ink-muted">
            Upload a flat, straight-on photo of one tile&apos;s surface (not the box). Products with a texture appear in the contractor&apos;s Tile Visualizer.
          </p>
          <ImageUploadField label="Tile surface texture" name="textureUrl" fileName="textureFile" defaultValue={p?.texture_url} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Tile width (mm)" name="tileWidthMm" type="number" min={10} step={1} defaultValue={p?.tile_width_mm ?? ''} placeholder="600" />
            <TextInput label="Tile height (mm)" name="tileHeightMm" type="number" min={10} step={1} defaultValue={p?.tile_height_mm ?? ''} placeholder="600" />
          </div>
        </div>
        <TextInput label="Display order" name="displayOrder" type="number" min={0} defaultValue={p?.display_order ?? 0} />
      </FormGrid>
      <CheckboxInput label="Show in contractor app" name="status" defaultChecked={p ? p.status === 'active' : true} />
    </>
  )
}

/** Admin control for the contractor app's Product Catalogue screen. */
export async function CatalogueTab() {
  const [categories, products] = await Promise.all([listCategories(), listProducts()])

  return (
    <>
      <Panel
        title="Categories"
        description="Category tiles at the top of the contractor's Product Catalogue. Hidden categories and their products are not shown."
        actions={
          <FormDialog triggerLabel="Add category" title="Add category">
            <ActionForm action={saveCategoryAction} submitLabel="Save category">
              <CategoryFields />
            </ActionForm>
          </FormDialog>
        }
      >
        {categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Add categories like Tiles, Sanitary, Marble or Stone." />
        ) : (
          <DataTable head={['Order', 'Category', 'Products', 'Status', 'Actions']}>
            {categories.map((c) => (
              <tr key={c.id}>
                <Td className="tabular-nums">{c.display_order}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {c.image_url ? <img src={c.image_url} alt="" className="size-10 rounded-md border border-border object-cover" /> : null}
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="font-mono text-xs text-ink-muted">{c.slug}</p>
                    </div>
                  </div>
                </Td>
                <Td className="tabular-nums">{fmtNumber(c.product_count)}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <FormDialog triggerLabel="Edit" title={`Edit ${c.name}`} variant="edit">
                      <ActionForm action={saveCategoryAction} submitLabel="Save category">
                        <CategoryFields c={c} />
                      </ActionForm>
                    </FormDialog>
                    <DeleteRecordButton entity="product_category" id={c.id} name={c.name} label="category" />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>

      <Panel
        title="Products"
        description="Products listed under each category in the contractor app. Active products also appear in the product dropdown when adding sales, reward rules and points."
        actions={
          categories.length > 0 ? (
            <FormDialog triggerLabel="Add product" title="Add product">
              <ActionForm action={saveProductAction} submitLabel="Save product">
                <ProductFields categories={categories} />
              </ActionForm>
            </FormDialog>
          ) : undefined
        }
      >
        {products.length === 0 ? (
          <EmptyState title="No products yet" description={categories.length === 0 ? 'Add a category first.' : 'Add the products contractors can refer.'} />
        ) : (
          <DataTable head={['Product', 'Category', 'Brand / Unit', 'Points / unit', 'Scheme', 'Status', 'Actions']}>
            {products.map((p) => (
              <tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    {p.image_url ? <img src={p.image_url} alt="" className="size-10 rounded-md border border-border object-cover" /> : null}
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      {p.description ? <p className="line-clamp-2 max-w-xs text-xs text-ink-muted">{p.description}</p> : null}
                      {p.texture_url ? <p className="mt-0.5 text-[11px] font-medium text-emerald-700">In Tile Visualizer</p> : null}
                    </div>
                  </div>
                </Td>
                <Td>{p.category_name}</Td>
                <Td className="text-xs">{[p.brand, p.unit].filter(Boolean).join(' · ') || '—'}</Td>
                <Td className="text-xs tabular-nums">{p.reward_points !== null ? `${fmtNumber(p.reward_points)} pts` : '—'}</Td>
                <Td className="text-xs">{p.scheme_label ?? '—'}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <FormDialog triggerLabel="Edit" title={`Edit ${p.name}`} variant="edit">
                      <ActionForm action={saveProductAction} submitLabel="Save product">
                        <ProductFields p={p} categories={categories} />
                      </ActionForm>
                    </FormDialog>
                    <DeleteRecordButton entity="product" id={p.id} name={p.name} label="product" />
                  </div>
                </Td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </>
  )
}
