import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    startAfter,
    Timestamp,
    DocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { Document, Trade, PlaybookRule, ShareLink, Notification } from '@/types';

// Collection references
export const getDocumentsRef = (userId: string) =>
    collection(db, 'users', userId, 'documents');

export const getTradesRef = (userId: string) =>
    collection(db, 'users', userId, 'trades');

export const getPlaybookRef = (userId: string) =>
    collection(db, 'users', userId, 'playbook');

export const getShareLinksRef = (userId: string) =>
    collection(db, 'users', userId, 'shareLinks');

export const getNotificationsRef = (userId: string) =>
    collection(db, 'users', userId, 'notifications');

// Document CRUD
export async function createDocument(userId: string, document: Omit<Document, 'id'>): Promise<string> {
    const docRef = await addDoc(getDocumentsRef(userId), {
        ...document,
        uploadedAt: Date.now(),
        updatedAt: Date.now(),
    });
    return docRef.id;
}

export async function getDocuments(
    userId: string,
    tags?: string[],
    limitCount: number = 50
): Promise<Document[]> {
    let q = query(
        getDocumentsRef(userId),
        orderBy('uploadedAt', 'desc'),
        limit(limitCount)
    );

    if (tags && tags.length > 0) {
        q = query(
            getDocumentsRef(userId),
            where('tags', 'array-contains-any', tags),
            orderBy('uploadedAt', 'desc'),
            limit(limitCount)
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Document[];
}

export async function getDocument(userId: string, docId: string): Promise<Document | null> {
    const docRef = doc(getDocumentsRef(userId), docId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as Document;
}

export async function updateDocument(
    userId: string,
    docId: string,
    data: Partial<Document>
): Promise<void> {
    const docRef = doc(getDocumentsRef(userId), docId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now(),
    });
}

export async function deleteDocument(userId: string, docId: string): Promise<void> {
    const docRef = doc(getDocumentsRef(userId), docId);
    await deleteDoc(docRef);
}

// Get documents expiring soon
export async function getExpiringDocuments(
    userId: string,
    daysThreshold: number = 30
): Promise<Document[]> {
    const thresholdDate = Date.now() + daysThreshold * 24 * 60 * 60 * 1000;

    const q = query(
        getDocumentsRef(userId),
        where('expiryDate', '<=', thresholdDate),
        where('expiryDate', '>', Date.now()),
        orderBy('expiryDate', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Document[];
}

// Trade CRUD
export async function createTrade(userId: string, trade: Omit<Trade, 'id'>): Promise<string> {
    const docRef = await addDoc(getTradesRef(userId), {
        ...trade,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
    return docRef.id;
}

export async function getTrades(
    userId: string,
    filters?: {
        startDate?: number;
        endDate?: number;
        instrument?: string;
        strategy?: string;
    },
    limitCount: number = 100
): Promise<Trade[]> {
    let q = query(
        getTradesRef(userId),
        orderBy('date', 'desc'),
        limit(limitCount)
    );

    // Note: Firestore has limitations on compound queries
    // For complex filtering, we'll filter client-side
    const snapshot = await getDocs(q);
    let trades = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Trade[];

    // Apply client-side filters
    if (filters) {
        if (filters.startDate) {
            trades = trades.filter((t) => t.date >= filters.startDate!);
        }
        if (filters.endDate) {
            trades = trades.filter((t) => t.date <= filters.endDate!);
        }
        if (filters.instrument) {
            trades = trades.filter((t) => t.instrument === filters.instrument);
        }
        if (filters.strategy) {
            trades = trades.filter((t) => t.strategy === filters.strategy);
        }
    }

    return trades;
}

export async function getTrade(userId: string, tradeId: string): Promise<Trade | null> {
    const docRef = doc(getTradesRef(userId), tradeId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as Trade;
}

export async function updateTrade(
    userId: string,
    tradeId: string,
    data: Partial<Trade>
): Promise<void> {
    const docRef = doc(getTradesRef(userId), tradeId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now(),
    });
}

export async function deleteTrade(userId: string, tradeId: string): Promise<void> {
    const docRef = doc(getTradesRef(userId), tradeId);
    await deleteDoc(docRef);
}

// Playbook CRUD
export async function createPlaybookRule(
    userId: string,
    rule: Omit<PlaybookRule, 'id'>
): Promise<string> {
    const docRef = await addDoc(getPlaybookRef(userId), {
        ...rule,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    });
    return docRef.id;
}

export async function getPlaybookRules(userId: string): Promise<PlaybookRule[]> {
    const q = query(getPlaybookRef(userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as PlaybookRule[];
}

export async function updatePlaybookRule(
    userId: string,
    ruleId: string,
    data: Partial<PlaybookRule>
): Promise<void> {
    const docRef = doc(getPlaybookRef(userId), ruleId);
    await updateDoc(docRef, {
        ...data,
        updatedAt: Date.now(),
    });
}

export async function deletePlaybookRule(userId: string, ruleId: string): Promise<void> {
    const docRef = doc(getPlaybookRef(userId), ruleId);
    await deleteDoc(docRef);
}

// Share Link CRUD
export async function createShareLink(
    userId: string,
    shareLink: Omit<ShareLink, 'id'>
): Promise<string> {
    const docRef = await addDoc(getShareLinksRef(userId), shareLink);
    return docRef.id;
}

export async function getShareLink(userId: string, linkId: string): Promise<ShareLink | null> {
    const docRef = doc(getShareLinksRef(userId), linkId);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) return null;

    return {
        id: snapshot.id,
        ...snapshot.data(),
    } as ShareLink;
}

export async function updateShareLink(
    userId: string,
    linkId: string,
    data: Partial<ShareLink>
): Promise<void> {
    const docRef = doc(getShareLinksRef(userId), linkId);
    await updateDoc(docRef, data);
}

// Notifications
export async function createNotification(
    userId: string,
    notification: Omit<Notification, 'id'>
): Promise<string> {
    const docRef = await addDoc(getNotificationsRef(userId), notification);
    return docRef.id;
}

export async function getNotifications(
    userId: string,
    unreadOnly: boolean = false
): Promise<Notification[]> {
    let q = query(
        getNotificationsRef(userId),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    if (unreadOnly) {
        q = query(
            getNotificationsRef(userId),
            where('isRead', '==', false),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    })) as Notification[];
}

export async function markNotificationRead(
    userId: string,
    notificationId: string
): Promise<void> {
    const docRef = doc(getNotificationsRef(userId), notificationId);
    await updateDoc(docRef, { isRead: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
    const notifications = await getNotifications(userId, true);
    const updates = notifications.map((n) =>
        updateDoc(doc(getNotificationsRef(userId), n.id), { isRead: true })
    );
    await Promise.all(updates);
}
