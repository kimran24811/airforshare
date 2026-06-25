package com.kissanbhai.app.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentSnapshot
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.kissanbhai.app.data.model.CategoryStats
import com.kissanbhai.app.data.model.Transaction
import com.kissanbhai.app.data.model.TransactionItem
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class TransactionRepository {
    private val collection = Firebase.firestore.collection("transactions")

    fun getTransactionsByCategory(category: String): Flow<List<Transaction>> = callbackFlow {
        val listener = collection
            .whereEqualTo("category", category)
            .orderBy("date", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.documents?.mapNotNull { docToTransaction(it) } ?: emptyList())
            }
        awaitClose { listener.remove() }
    }

    fun getTransactionsByCustomer(customerId: String): Flow<List<Transaction>> = callbackFlow {
        val listener = collection
            .whereEqualTo("customerId", customerId)
            .orderBy("date", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.documents?.mapNotNull { docToTransaction(it) } ?: emptyList())
            }
        awaitClose { listener.remove() }
    }

    fun getAllTransactions(): Flow<List<Transaction>> = callbackFlow {
        val listener = collection
            .orderBy("date", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                trySend(snapshot?.documents?.mapNotNull { docToTransaction(it) } ?: emptyList())
            }
        awaitClose { listener.remove() }
    }

    fun getCategoryStats(category: String): Flow<CategoryStats> = callbackFlow {
        val listener = collection
            .whereEqualTo("category", category)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val txns = snapshot?.documents?.mapNotNull { docToTransaction(it) } ?: emptyList()
                trySend(CategoryStats(
                    totalSales = txns.sumOf { it.totalAmount },
                    totalReceived = txns.sumOf { it.totalPaid },
                    totalRemaining = txns.sumOf { it.totalBalance },
                    entryCount = txns.size,
                    customerCount = txns.map { it.customerId }.distinct().size
                ))
            }
        awaitClose { listener.remove() }
    }

    suspend fun addTransaction(transaction: Transaction) {
        val items = transaction.items.map {
            hashMapOf("name" to it.name, "price" to it.price, "paid" to it.paid, "balance" to it.balance)
        }
        val data = hashMapOf(
            "customerId" to transaction.customerId,
            "customerName" to transaction.customerName,
            "customerPhone" to transaction.customerPhone,
            "category" to transaction.category,
            "items" to items,
            "description" to transaction.description,
            "totalAmount" to transaction.totalAmount,
            "totalPaid" to transaction.totalPaid,
            "totalBalance" to transaction.totalBalance,
            "date" to Timestamp.now()
        )
        collection.add(data).await()
    }

    suspend fun addPayment(transactionId: String, paymentAmount: Double) {
        val doc = collection.document(transactionId).get().await()
        val currentPaid = doc.getDouble("totalPaid") ?: 0.0
        val totalAmount = doc.getDouble("totalAmount") ?: 0.0
        val newPaid = (currentPaid + paymentAmount).coerceAtMost(totalAmount)
        collection.document(transactionId).update(
            mapOf("totalPaid" to newPaid, "totalBalance" to (totalAmount - newPaid))
        ).await()
    }

    suspend fun getTransactionById(id: String): Transaction? {
        return try {
            val doc = collection.document(id).get().await()
            docToTransaction(doc)
        } catch (e: Exception) { null }
    }

    @Suppress("UNCHECKED_CAST")
    private fun docToTransaction(doc: DocumentSnapshot): Transaction? {
        if (!doc.exists()) return null
        return try {
            val itemsList = (doc.get("items") as? List<Map<String, Any>>)?.map { map ->
                TransactionItem(
                    name = map["name"] as? String ?: "",
                    price = (map["price"] as? Double) ?: (map["price"] as? Long)?.toDouble() ?: 0.0,
                    paid = (map["paid"] as? Double) ?: (map["paid"] as? Long)?.toDouble() ?: 0.0,
                    balance = (map["balance"] as? Double) ?: (map["balance"] as? Long)?.toDouble() ?: 0.0
                )
            } ?: emptyList()
            Transaction(
                id = doc.id,
                customerId = doc.getString("customerId") ?: "",
                customerName = doc.getString("customerName") ?: "",
                customerPhone = doc.getString("customerPhone") ?: "",
                category = doc.getString("category") ?: "",
                items = itemsList,
                description = doc.getString("description") ?: "",
                totalAmount = doc.getDouble("totalAmount") ?: 0.0,
                totalPaid = doc.getDouble("totalPaid") ?: 0.0,
                totalBalance = doc.getDouble("totalBalance") ?: 0.0,
                date = doc.getTimestamp("date")
            )
        } catch (e: Exception) { null }
    }
}
