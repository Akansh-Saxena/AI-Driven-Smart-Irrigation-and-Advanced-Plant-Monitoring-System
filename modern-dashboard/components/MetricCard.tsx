import React from 'react';
import { Card, CardContent } from './ui/card';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string | number;
    unit?: string;
    icon: LucideIcon;
    trend?: string;
    colorClass?: string;
}

export function MetricCard({ title, value, unit, icon: Icon, trend, colorClass = "text-blue-400" }: MetricCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="bg-white/5 border-white/10 backdrop-blur-md overflow-hidden relative group">
                {/* Subtle gradient glow behind the card content */}
                <div className={`absolute -inset-1 bg-gradient-to-r from-transparent via-${colorClass.replace('text-', '')}/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500 blur-md`} />

                <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-400 mb-1">{title}</p>
                            <div className="flex items-baseline gap-1">
                                <h3 className={`text-3xl font-bold ${colorClass}`}>{value}</h3>
                                {unit && <span className="text-slate-500 text-sm font-semibold">{unit}</span>}
                            </div>
                            {trend && (
                                <p className="text-xs text-slate-500 mt-2">
                                    <span className="text-emerald-400">{trend}</span> vs last hour
                                </p>
                            )}
                        </div>
                        <div className={`p-3 rounded-xl bg-white/5 border border-white/5`}>
                            <Icon className={`w-6 h-6 ${colorClass}`} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
