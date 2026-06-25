package com.kissanbhai.app.data.model

import com.google.firebase.Timestamp

data class Transaction(
    val id: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val customerPhone: String = "",
    val category: String = "",
    val items: List<TransactionItem> = emptyList(),
    val description: String = "",
    val totalAmount: Double = 0.0,
    val totalPaid: Double = 0.0,
    val totalBalance: Double = 0.0,
    val date: Timestamp? = null
)

object Category {
    const val PESTICIDE = "pesticide"
    const val SOLAR = "solar"
}
