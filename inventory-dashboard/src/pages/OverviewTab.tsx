import { Card, CardContent } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', sales: 4000 },
  { name: 'Feb', sales: 3000 },
  { name: 'Mar', sales: 5000 },
  { name: 'Apr', sales: 2000 },
];

export function OverviewTab() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Toplam Ürün</p>
          <p className="text-2xl font-semibold">128</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Aktif Şube</p>
          <p className="text-2xl font-semibold">5</p>
        </CardContent>
      </Card>
      <Card className="col-span-full xl:col-span-3">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">Aylık Satışlar</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
