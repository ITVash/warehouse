import { redirect } from 'next/navigation';

export default async function WarehouseIndexPage({
  params,
}: {
  params: Promise<{ warehouseId: string }>;
}) {
  const { warehouseId } = await params;
  redirect(`/warehouse/${warehouseId}/orders`);
}
