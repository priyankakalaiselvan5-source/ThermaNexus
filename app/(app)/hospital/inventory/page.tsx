'use client';

import { PageHeader } from '@/components/ui/page-components';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Boxes, AlertTriangle, Thermometer, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

const INVENTORY = [
  { medicine: 'COVID-19 Vaccine', type: 'Vaccine', batch: 'BT-2024-001', expiry: '2024-12-31', quantity: 5000, tempRange: '2-8°C', status: 'safe' },
  { medicine: 'Insulin Penfills', type: 'Insulin', batch: 'BT-2024-002', expiry: '2024-08-15', quantity: 1200, tempRange: '2-8°C', status: 'safe' },
  { medicine: 'Antibiotics IV', type: 'Antibiotic', batch: 'BT-2024-003', expiry: '2024-06-30', quantity: 800, tempRange: '2-8°C', status: 'warning' },
  { medicine: 'Flu Vaccine', type: 'Vaccine', batch: 'BT-2024-004', expiry: '2025-01-15', quantity: 3000, tempRange: '2-8°C', status: 'safe' },
  { medicine: 'Heparin Injection', type: 'Anticoagulant', batch: 'BT-2024-005', expiry: '2024-09-20', quantity: 600, tempRange: '2-8°C', status: 'safe' },
  { medicine: 'MMR Vaccine', type: 'Vaccine', batch: 'BT-2024-006', expiry: '2024-11-10', quantity: 1500, tempRange: '2-8°C', status: 'safe' },
];

export default function HospitalInventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Medicine Inventory"
        description="View all medicines received by your hospital"
        icon={Boxes}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Safe Temp Range</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {INVENTORY.map((item) => (
                <TableRow key={item.batch}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      {item.medicine}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{item.type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{item.batch}</TableCell>
                  <TableCell>{item.expiry}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      {item.quantity} vials
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Thermometer className="h-3 w-3" />
                      {item.tempRange}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      item.status === 'safe' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    )}>
                      {item.status === 'safe' ? 'Safe' : 'Warning'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
