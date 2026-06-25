package com.kissanbhai.app.data.repository

import com.google.firebase.Timestamp
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import com.kissanbhai.app.data.model.Customer
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class CustomerRepository {
    private val collection = Firebase.firestore.collection("customers")

    fun getAllCustomers(): Flow<List<Customer>> = callbackFlow {
        val listener = collection
            .orderBy("name", Query.Direction.ASCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val customers = snapshot?.documents?.mapNotNull { doc ->
                    try {
                        Customer(
                            id = doc.id,
                            name = doc.getString("name") ?: "",
                            phone = doc.getString("phone") ?: "",
                            createdAt = doc.getTimestamp("createdAt")
                        )
                    } catch (e: Exception) { null }
                } ?: emptyList()
                trySend(customers)
            }
        awaitClose { listener.remove() }
    }

    suspend fun addCustomer(name: String, phone: String): Customer {
        val data = hashMapOf(
            "name" to name,
            "phone" to phone,
            "createdAt" to Timestamp.now()
        )
        val ref = collection.add(data).await()
        return Customer(id = ref.id, name = name, phone = phone)
    }

    suspend fun getCustomerById(id: String): Customer? {
        return try {
            val doc = collection.document(id).get().await()
            if (!doc.exists()) null
            else Customer(
                id = doc.id,
                name = doc.getString("name") ?: "",
                phone = doc.getString("phone") ?: "",
                createdAt = doc.getTimestamp("createdAt")
            )
        } catch (e: Exception) { null }
    }
}
