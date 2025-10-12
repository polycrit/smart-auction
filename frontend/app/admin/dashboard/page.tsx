import { SectionCards } from '@/components/section-cards';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { DataTable } from '@/components/data-table';
import data from '../data.json';
import { PageHeader } from '@/components/ui/page-header';

export default function Page() {
    return (
        <>
            <PageHeader text="Dashboard" subtext="Relevant auction-related KPIs and charts" />
            <SectionCards />
            <ChartAreaInteractive />
            <DataTable data={data} />
        </>
    );
}
