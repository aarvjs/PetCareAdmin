'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { BarChart3, TrendingUp, DollarSign, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Financial & Operations Reports"
        subtitle="Download analytics summaries for product sales, clinic revenues, and customer metrics."
        action={<Button icon={<Download className="w-4 h-4" />}>Export PDF Report</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="p-3 bg-[#F1EEFF] text-[#7567E8] w-fit rounded-xl mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-[#25242A]">$23,230.50</h3>
          <p className="text-xs text-[#737780] font-medium mt-1">Total Platform Revenue (YTD)</p>
        </Card>

        <Card>
          <div className="p-3 bg-[#EAF8FE] text-[#72CFF2] w-fit rounded-xl mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-[#25242A]">1,762</h3>
          <p className="text-xs text-[#737780] font-medium mt-1">Completed E-Commerce Transactions</p>
        </Card>

        <Card>
          <div className="p-3 bg-[#DFF7EE] text-[#35B779] w-fit rounded-xl mb-3">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-[#25242A]">94.8%</h3>
          <p className="text-xs text-[#737780] font-medium mt-1">Clinic Appointment Satisfaction</p>
        </Card>
      </div>
    </div>
  );
}
