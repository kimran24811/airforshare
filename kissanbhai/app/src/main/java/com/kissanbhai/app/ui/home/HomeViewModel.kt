package com.kissanbhai.app.ui.home

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.kissanbhai.app.data.model.Customer
import com.kissanbhai.app.data.repository.CustomerRepository
import com.kissanbhai.app.data.repository.TransactionRepository
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {
    private val customerRepo = CustomerRepository()
    private val txnRepo = TransactionRepository()

    val allCustomers = customerRepo.getAllCustomers().asLiveData()
    val filteredCustomers = MutableLiveData<List<Customer>>(emptyList())

    val pesticideStats = txnRepo.getCategoryStats("pesticide").asLiveData()
    val solarStats = txnRepo.getCategoryStats("solar").asLiveData()

    val overallStats = txnRepo.getAllTransactions().map { txns ->
        Pair(txns.sumOf { it.totalAmount }, txns.sumOf { it.totalBalance })
    }.asLiveData()

    fun filterCustomers(query: String) {
        viewModelScope.launch {
            val all = allCustomers.value ?: emptyList()
            filteredCustomers.value = if (query.isBlank()) all
            else {
                val lower = query.lowercase()
                all.filter { it.name.lowercase().contains(lower) || it.phone.contains(lower) }
            }
        }
    }
}
