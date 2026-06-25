package com.kissanbhai.app.ui.customer

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.kissanbhai.app.R
import com.kissanbhai.app.data.repository.CustomerRepository
import com.kissanbhai.app.data.repository.TransactionRepository
import com.kissanbhai.app.databinding.FragmentCustomerDetailBinding
import com.kissanbhai.app.ui.common.TransactionListAdapter
import com.kissanbhai.app.util.CurrencyFormatter
import kotlinx.coroutines.launch

class CustomerDetailFragment : Fragment() {
    private var _binding: FragmentCustomerDetailBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?) =
        FragmentCustomerDetailBinding.inflate(inflater, container, false).also { _binding = it }.root

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }

        val customerId = arguments?.getString("customerId") ?: return
        val customerRepo = CustomerRepository()
        val txnRepo = TransactionRepository()

        lifecycleScope.launch {
            val customer = customerRepo.getCustomerById(customerId)
            binding.tvName.text = customer?.name ?: "Unknown"
            binding.tvPhone.text = customer?.phone?.takeIf { it.isNotBlank() } ?: "No phone"
            binding.toolbar.title = customer?.name ?: "Customer"
        }

        val adapter = TransactionListAdapter { txn ->
            findNavController().navigate(
                R.id.action_customerDetail_to_entryDetail,
                bundleOf("transactionId" to txn.id)
            )
        }
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.recycler.adapter = adapter

        lifecycleScope.launch {
            txnRepo.getTransactionsByCustomer(customerId).collect { txns ->
                adapter.submitList(txns)
                val totalSales = txns.sumOf { it.totalAmount }
                val totalBalance = txns.sumOf { it.totalBalance }
                binding.tvTotalSales.text = "Total Sales: ${CurrencyFormatter.format(totalSales)}"
                binding.tvBalance.text = "Outstanding: ${CurrencyFormatter.format(totalBalance)}"
                val color = if (totalBalance > 0)
                    requireContext().getColor(android.R.color.holo_red_dark)
                else requireContext().getColor(android.R.color.holo_green_dark)
                binding.tvBalance.setTextColor(color)
                binding.tvEmpty.visibility = if (txns.isEmpty()) View.VISIBLE else View.GONE
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
