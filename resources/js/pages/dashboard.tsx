import AppLayout from '@/layouts/app-layout';
import DashboardStats from '@/components/dashboard-stats';
import { usePage } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

const Dashboard = ({taskData}: any) => {
    const { props } = usePage<any>();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 md:p-8">
                <div className="w-full rounded-lg bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6 md:p-8">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
                        Hola, {props?.auth?.user?.name ?? 'Usuario'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">Bienvenido a tu calendario</p>
                </div>

                <div className="grid auto-rows-min gap-6 md:grid-cols-3">
                    <div className="rounded-lg relative min-h-[140px] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6">
                        <span className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 z-10">
                            Tarea próxima
                        </span>
                        <p className="text-sm font-semibold uppercase inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-600/20 px-4 py-2 text-indigo-700 dark:text-indigo-200 mt-2">
                            {taskData.proxima}
                        </p>
                    </div>
                    <div className="rounded-lg relative min-h-[140px] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6">
                        <span className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 z-10">
                            Tareas pendientes
                        </span>
                        <p className="text-2xl font-extrabold uppercase inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-600/20 px-4 py-2 text-indigo-700 dark:text-indigo-200 mt-2">
                            {taskData.pendientes}
                        </p>
                    </div>
                    <div className="rounded-lg relative min-h-[140px] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-6">
                        <span className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 z-10">
                            Tareas atrasadas
                        </span>
                        <p className="text-2xl font-extrabold uppercase inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-700/20 px-4 py-2 text-rose-700 dark:text-rose-200 mt-2">
                            {taskData.atrasadas}
                        </p>
                    </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-lg relative min-h-[360px]">
                    <DashboardStats taskData={taskData} />
                </div>
            </div>
        </AppLayout>
    );
}

export default Dashboard;