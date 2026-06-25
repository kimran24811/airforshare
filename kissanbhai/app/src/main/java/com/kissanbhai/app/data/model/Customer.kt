package com.kissanbhai.app.data.model

import com.google.firebase.Timestamp

data class Customer(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val createdAt: Timestamp? = null
)
