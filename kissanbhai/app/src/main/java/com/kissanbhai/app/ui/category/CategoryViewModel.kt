package com.kissanbhai.app.ui.category

import androidx.lifecycle.LiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import com.kissanbhai.app.data.model.CategoryStats
import com.kissanbhai.app.data.model.Transaction
import com.kissanbhai.app.data.repository.TransactionRepository

class CategoryViewModel : ViewModel() {
    private val repo = TransactionRepository()
    lateinit var transactions: LiveData<List<Transaction>>
    lateinit var stats: LiveData<CategoryStats>

    fun init(category: String) {
        if (::transactions.isInitialized) return
        transactions = repo.getTransactionsByCategory(category).asLiveData()
        stats = repo.getCategoryStats(category).asLiveData()
    }
}
