package com.kissanbhai.app.ui.category

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.kissanbhai.app.R
import com.kissanbhai.app.databinding.FragmentCategoryBinding
import com.kissanbhai.app.ui.common.TransactionListAdapter
import com.kissanbhai.app.util.CurrencyFormatter

class CategoryFragment : Fragment() {
    private var _binding: FragmentCategoryBinding? = null
    private val binding get() = _binding!!
    private val vm: CategoryViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?) =
        FragmentCategoryBinding.inflate(inflater, container, false).also { _binding = it }.root

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val category = arguments?.getString("category") ?: "pesticide"
        vm.init(category)

        val title = if (category == "pesticide") "🌿 Pesticide" else "☀️ Solar"
        binding.toolbar.title = title
        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }

        val adapter = TransactionListAdapter { txn ->
            findNavController().navigate(
                R.id.action_category_to_entryDetail,
                bundleOf("transactionId" to txn.id)
            )
        }
        binding.recycler.layoutManager = LinearLayoutManager(requireContext())
        binding.recycler.adapter = adapter

        vm.stats.observe(viewLifecycleOwner) { stats ->
            binding.tvTotalSales.text = CurrencyFormatter.format(stats.totalSales)
            binding.tvTotalReceived.text = CurrencyFormatter.format(stats.totalReceived)
            binding.tvTotalRemaining.text = CurrencyFormatter.format(stats.totalRemaining)
            binding.tvMeta.text = "${stats.entryCount} entries  •  ${stats.customerCount} customers"
        }

        vm.transactions.observe(viewLifecycleOwner) { txns ->
            adapter.submitList(txns)
            binding.tvEmpty.visibility = if (txns.isEmpty()) View.VISIBLE else View.GONE
        }

        binding.fab.setOnClickListener {
            findNavController().navigate(
                R.id.action_category_to_newEntry,
                bundleOf("category" to category)
            )
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
