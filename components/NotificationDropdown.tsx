import React, { useState, useMemo } from 'react';
import { Notification } from '../services/api';
import { getNotificationConfig, getCategoryLabel, NotificationCategory } from './NotificationTypes';

interface NotificationDropdownProps {
    notifications: Notification[];
    onMarkAllRead?: () => void;
    onViewAll?: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    notifications,
    onMarkAllRead,
    onViewAll
}) => {
    const [selectedCategory, setSelectedCategory] = useState<NotificationCategory | 'all'>('all');

    // Group notifications by category
    const groupedNotifications = useMemo(() => {
        const grouped: Record<string, Notification[]> = {};
        notifications.forEach(notif => {
            const config = getNotificationConfig(notif.type);
            const category = config.category;
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(notif);
        });
        return grouped;
    }, [notifications]);

    // Get filtered notifications
    const filteredNotifications = useMemo(() => {
        if (selectedCategory === 'all') {
            return notifications;
        }
        return notifications.filter(notif => {
            const config = getNotificationConfig(notif.type);
            return config.category === selectedCategory;
        });
    }, [notifications, selectedCategory]);

    // Get category counts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: notifications.length };
        Object.keys(groupedNotifications).forEach(category => {
            counts[category] = groupedNotifications[category].length;
        });
        return counts;
    }, [groupedNotifications, notifications.length]);

    const categories: (NotificationCategory | 'all')[] = ['all', 'candidate', 'job', 'automation', 'communication', 'system'];

    return (
        <div className="absolute right-0 top-full mt-3 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                {onMarkAllRead && (
                    <button 
                        onClick={onMarkAllRead}
                        className="text-xs text-black hover:underline font-medium"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Category Filter */}
            {notifications.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-b border-gray-100 bg-gray-50/30">
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {categories.map(category => {
                            const count = categoryCounts[category] || 0;
                            if (category === 'all' || count > 0) {
                                return (
                                    <button
                                        key={category}
                                        onClick={() => setSelectedCategory(category)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                                            selectedCategory === category
                                                ? 'bg-gray-900 text-white'
                                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                    >
                                        {category === 'all' ? 'All' : getCategoryLabel(category)}
                                        {count > 0 && (
                                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] ${
                                                selectedCategory === category
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            }
                            return null;
                        })}
                    </div>
                </div>
            )}

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((note) => {
                        const config = getNotificationConfig(note.type);
                        const Icon = config.icon;
                        
                        return (
                            <div
                                key={note.id}
                                className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer ${
                                    note.unread ? 'bg-blue-50/30' : ''
                                }`}
                            >
                                <div className="flex gap-3 items-start">
                                    <div className={`mt-1 flex-shrink-0 p-2 rounded-lg ${config.bgColor}`}>
                                        <Icon size={16} className={config.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm flex-1 ${note.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {note.title}
                                            </p>
                                            {note.unread && (
                                                <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5"></div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{note.desc}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-[10px] text-gray-400 font-medium">{note.time}</p>
                                            {config.category !== 'system' && (
                                                <span className="text-[10px] text-gray-400 font-medium capitalize">
                                                    {getCategoryLabel(config.category)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-8 text-center text-sm text-gray-500 italic">
                        {selectedCategory === 'all' 
                            ? 'No new notifications' 
                            : `No ${getCategoryLabel(selectedCategory).toLowerCase()} notifications`}
                    </div>
                )}
            </div>

            {/* Footer */}
            {onViewAll && (
                <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
                    <button 
                        onClick={onViewAll}
                        className="text-xs font-bold text-gray-900 hover:text-gray-700"
                    >
                        View All Activity
                    </button>
                </div>
            )}
        </div>
    );
};













