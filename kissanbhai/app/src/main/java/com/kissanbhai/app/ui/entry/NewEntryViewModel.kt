package com.kissanbhai.app.ui.entry

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.asLiveData
import androidx.lifecycle.viewModelScope
import com.kissanbhai.app.data.model.Customer
import com.kissanbhai.app.data.model.Transaction
import com.kissanbhai.app.data.model.TransactionItem
import com.kissanbhai.app.data.repository.CustomerRepository
import com.kissanbhai.app.data.repository.TransactionRepository
import kotlinx.coroutines.launch

class NewEntryViewModel : ViewModel() {
    private val customerRepo = CustomerRepository()
    private val txnRepo = TransactionRepository()

    val allCustomers = customerRepo.getAllCustomers().asLiveData()
    val filteredCustomers = MutableLiveData<List<Customer>>(emptyList())
    val selectedCategory = MutableLiveData("")
    val totals = MutableLiveData(Triple(0.0, 0.0, 0.0))

    private var selectedCustomer: Customer? = null

    fun init(presetCategory: String) {
        if (presetCategory.isNotEmpty()) selectedCategory.value = presetCategory
    }

    fun selectCategory(cat: String) { selectedCategory.value = cat }

    fun selectCustomer(customer: Customer) { selectedCustomer = customer }

    fun filterCustomers(query: String) {
        val all = allCustomers.value ?: emptyList()
        filteredCustomers.value = if (query.isBlank()) all
        else {
            val lower = query.lowercase()
            all.filter { it.name.lowercase().contains(lower) || it.phone.contains(lower) }
        }
    }

    fun recalculate(items: List<TransactionItem>) {
        val amount = items.sumOf { it.price }
        val paid = items.sumOf { it.paid }
        totals.value = Triple(amount, paid, amount - paid)
    }

    fun createAndSelectCustomer(name: String, onDone: (Customer) -> Unit) {
        viewModelScope.launch {
            val customer = customerRepo.addCustomer(name.trim(), "")
            selectedCustomer = customer
            onDone(customer)
        }
    }

    suspend fun save(items: List<TransactionItem>, description: String): Result<Unit> {
        val customer = selectedCustomer
            ?: return Result.failure(Exception("Please select a customer"))
        val category = selectedCategory.value?.takeIf { it.isNotEmpty() }
            ?: return Result.failure(Exception("Please select a category (Pesticide or Solar)"))

        val validItems = items.filter { it.name.isNotBlank() }.map { it.copy(balance = it.price - it.paid) }
        if (validItems.isEmpty()) return Result.failure(Exception("Please add at least one item"))

        return try {
            txnRepo.addTransaction(Transaction(
                customerId = customer.id,
                customerName = customer.name,
                customerPhone = customer.phone,
                category = category,
                items = validItems,
                description = description,
                totalAmount = validItems.sumOf { it.price },
                totalPaid = validItems.sumOf { it.paid },
                totalBalance = validItems.sumOf { it.price - it.paid }
            ))
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
