import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatTime } from '../../../utils/helpers';

// FAKE DATA for the chart. In a real application, you would fetch this data from your backend.
// It should be a time-series of events (e.g., from a dedicated 'events' collection in Firestore).
const generateFakeChartData = () => {
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        data.push({
            date: date.toISOString().split('T')[0], // YYYY-MM-DD
            logins: Math.floor(Math.random() * 15) + 5,
            attempts: Math.floor(Math.random() * 25) + 10,
            prevLogins: Math.floor(Math.random() * 12) + 3,
            prevAttempts: Math.floor(Math.random() * 20) + 8,
        });
    }
    return data;
};
const FAKE_CHART_DATA = generateFakeChartData();

const aggregateData = (data, period) => {
    const aggregated = {};
    const getPeriodKey = (date) => {
        const d = new Date(date);
        if (period === 'Daily') return d.toISOString().split('T')[0];
        if (period === 'Weekly') {
            const first = d.getDate() - d.getDay();
            const firstDay = new Date(d.setDate(first));
            return firstDay.toISOString().split('T')[0];
        }
        if (period === 'Monthly') {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
        return date;
    };

    data.forEach(item => {
        const key = getPeriodKey(item.date);
        if (!aggregated[key]) {
            aggregated[key] = { date: key, logins: 0, attempts: 0, prevLogins: 0, prevAttempts: 0 };
        }
        aggregated[key].logins += item.logins;
        aggregated[key].attempts += item.attempts;
        aggregated[key].prevLogins += item.prevLogins;
        aggregated[key].prevAttempts += item.prevAttempts;
    });

    return Object.values(aggregated).sort((a, b) => new Date(a.date) - new Date(b.date));
};


const UsageStatsTab = ({ users, courses, activityLogs }) => {
    const [timeMetric, setTimeMetric] = useState('total'); // 'total' or 'avg'
    const [userSortConfig, setUserSortConfig] = useState({ key: 'name', direction: 'ascending' });
    const [chartPeriod, setChartPeriod] = useState('Daily');

    const stats = useMemo(() => {
        const totalTrainingTime = activityLogs.reduce((sum, u) => sum + (u.totalTrainingTime || 0), 0);
        const totalAttempts = activityLogs.reduce((sum, u) => sum + (u.attempts || 0), 0);
        return {
            totalTrainingTime,
            avgTrainingTime: activityLogs.length > 0 ? totalTrainingTime / activityLogs.length : 0,
            totalAttempts,
            totalPasses: activityLogs.reduce((sum, u) => sum + (u.passes || 0), 0),
            totalFails: activityLogs.reduce((sum, u) => sum + (u.fails || 0), 0),
        };
    }, [activityLogs]);

    const topUsers = useMemo(() => {
        return users
            .map(u => ({ ...u, ...activityLogs.find(log => log.id === u.id)}))
            .sort((a, b) => (b.totalTrainingTime || 0) - (a.totalTrainingTime || 0))
            .slice(0, 3);
    }, [users, activityLogs]);
    
    const sortedUserActivity = useMemo(() => {
        const activityData = users.map(u => ({ ...u, ...activityLogs.find(log => log.id === u.id) }));
        let sortableItems = [...activityData];
        if (userSortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[userSortConfig.key] || 0;
                const valB = b[userSortConfig.key] || 0;
                if (valA < valB) return userSortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return userSortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [userSortConfig, users, activityLogs]);
    
    const chartData = useMemo(() => aggregateData(FAKE_CHART_DATA, chartPeriod), [chartPeriod]);

    const requestUserSort = (key) => {
        let direction = 'ascending';
        if (userSortConfig.key === key && userSortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setUserSortConfig({ key, direction });
    };
    const getSortIcon = (key) => {
        if (userSortConfig.key !== key) return <i className="fa-solid fa-sort ml-2 text-neutral-400"></i>;
        if (userSortConfig.direction === 'ascending') return <i className="fa-solid fa-sort-up ml-2"></i>;
        return <i className="fa-solid fa-sort-down ml-2"></i>;
    };

    const MetricCard = ({ title, value, children }) => ( 
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
            <div className="flex justify-between items-start">
                <h4 className="text-sm text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{title}</h4>
                {children}
            </div>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">{value}</p>
        </div> 
    );
    
    const ChartPeriodToggle = ({ selected, onChange }) => (
        <div className="flex space-x-1 bg-neutral-200 dark:bg-neutral-700 p-1 rounded-md">
            {['Daily', 'Weekly', 'Monthly'].map(period => (
                <button 
                    key={period} 
                    onClick={() => onChange(period)} 
                    className={`px-3 py-1 text-xs rounded-md ${selected === period ? 'bg-white dark:bg-neutral-600 shadow font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}
                >
                    {period}
                </button>
            ))}
        </div>
    );

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <MetricCard title="Training Time" value={formatTime(timeMetric === 'total' ? stats.totalTrainingTime : stats.avgTrainingTime)}>
                    <div className="flex space-x-1 bg-neutral-200 dark:bg-neutral-700 p-1 rounded-md">
                        <button onClick={() => setTimeMetric('total')} className={`px-2 py-1 text-xs rounded ${timeMetric === 'total' ? 'bg-white dark:bg-neutral-600 shadow' : 'text-neutral-500 dark:text-neutral-400'}`}>Total</button>
                        <button onClick={() => setTimeMetric('avg')} className={`px-2 py-1 text-xs rounded ${timeMetric === 'avg' ? 'bg-white dark:bg-neutral-600 shadow' : 'text-neutral-500 dark:text-neutral-400'}`}>Avg</button>
                    </div>
                </MetricCard>
                <MetricCard title="Total Attempts" value={stats.totalAttempts} />
                <MetricCard title="Total Passes" value={stats.totalPasses} />
                <MetricCard title="Total Fails" value={stats.totalFails} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-white">Activity</h3>
                        <ChartPeriodToggle selected={chartPeriod} onChange={setChartPeriod} />
                   </div>
                   <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false}/>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(38, 38, 38, 0.8)', border: 'none', borderRadius: '0.5rem' }} labelStyle={{ color: '#fafafa' }}/>
                                <Legend wrapperStyle={{fontSize: "12px"}}/>
                                <Line type="monotone" dataKey="logins" name="Logins" stroke="#3b82f6" strokeWidth={2} dot={false}/>
                                <Line type="monotone" dataKey="attempts" name="Attempts" stroke="#8b5cf6" strokeWidth={2} dot={false}/>
                                <Line type="monotone" dataKey="prevLogins" name="Prev. Logins" stroke="#3b82f6" strokeOpacity={0.4} strokeDasharray="5 5" dot={false}/>
                                <Line type="monotone" dataKey="prevAttempts" name="Prev. Attempts" stroke="#8b5cf6" strokeOpacity={0.4} strokeDasharray="5 5" dot={false}/>
                            </LineChart>
                        </ResponsiveContainer>
                   </div>
                </div>
                <div className="space-y-6">
                   <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Top Users by Time</h3>
                        <ul className="space-y-3">
                            {topUsers.map((user, i) => (
                                <li key={user.id} className="flex justify-between items-center text-sm">
                                    <span className="text-neutral-800 dark:text-neutral-200">{i+1}. {user.name}</span>
                                    <span className="font-mono text-neutral-500 dark:text-neutral-400">{formatTime(user.totalTrainingTime || 0)}</span>
                                </li>
                            ))}
                        </ul>
                   </div>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md dark:shadow-neutral-900 p-4">
                <h3 className="font-semibold mb-4 text-neutral-900 dark:text-white">All User Activity</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left"><thead className="bg-neutral-100 dark:bg-neutral-800"><tr className="text-neutral-600 dark:text-neutral-400">
                        {[{key: 'name', label: 'Employee'}, {key: 'logins', label: 'Logins'}, {key: 'lastLogin', label: 'Last Login'}, {key: 'attempts', label: 'Attempts'}, {key: 'passes', label: 'Passes'}, {key: 'fails', label: 'Fails'}, {key: 'passRate', label: 'Pass Rate'}, {key: 'totalTrainingTime', label: 'Total Training Time'}].map(h => (
                            <th key={h.key} className="p-3 font-semibold tracking-wider cursor-pointer" onClick={() => requestUserSort(h.key)}>{h.label} {getSortIcon(h.key)}</th>
                        ))}
                        <th className="p-3 font-semibold tracking-wider">Avg. Training Time</th>
                    </tr></thead><tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">{sortedUserActivity.map(user => {
                        const avgTime = (user.attempts || 0) > 0 ? (user.totalTrainingTime || 0) / user.attempts : 0;
                        const lastLoginDate = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
                        return (
                            <tr key={user.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                <td className="p-3 font-semibold text-neutral-800 dark:text-white">{user.name}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.logins || 0}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{lastLoginDate}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.attempts || 0}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.passes || 0}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{user.fails || 0}</td>
                                <td className="p-3 text-neutral-600 dark:text-neutral-300">{`${user.passRate || 0}%`}</td>
                                <td className="p-3 font-mono text-neutral-600 dark:text-neutral-300">{formatTime(user.totalTrainingTime || 0)}</td>
                                <td className="p-3 font-mono text-neutral-600 dark:text-neutral-300">{formatTime(avgTime)}</td>
                            </tr>
                        );
                    })}</tbody></table>
                </div>
            </div>
        </div>
    );
};

UsageStatsTab.propTypes = {
    users: PropTypes.array.isRequired,
    courses: PropTypes.array.isRequired,
    activityLogs: PropTypes.array.isRequired,
};

export default UsageStatsTab;

