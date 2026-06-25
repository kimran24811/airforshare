package com.kissanbhai.app.ui.home

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import androidx.core.os.bundleOf
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.kissanbhai.app.R
import com.kissanbhai.app.databinding.FragmentHomeBinding
import com.kissanbhai.app.util.CurrencyFormatter

class HomeFragment : Fragment() {
    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val vm: HomeViewModel by viewModels()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?) =
        FragmentHomeBinding.inflate(inflater, container, false).also { _binding = it }.root

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        vm.allCustomers.observe(viewLifecycleOwner) { customers ->
            vm.filterCustomers(binding.etSearch.text?.toString() ?: "")
        }

        vm.filteredCustomers.observe(viewLifecycleOwner) { customers ->
            val names = customers.map { it.name }
            val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, names)
            binding.etSearch.setAdapter(adapter)
        }

        binding.etSearch.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { vm.filterCustomers(s?.toString() ?: "") }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })

        binding.etSearch.setOnItemClickListener { _, _, position, _ ->
            val customer = vm.filteredCustomers.value?.getOrNull(position) ?: return@setOnItemClickListener
            binding.etSearch.setText("")
            findNavController().navigate(
                R.id.action_home_to_customerDetail,
                bundleOf("customerId" to customer.id)
            )
        }

        vm.overallStats.observe(viewLifecycleOwner) { (sales, receivable) ->
            binding.tvTotalSales.text = CurrencyFormatter.format(sales)
            binding.tvTotalReceivable.text = CurrencyFormatter.format(receivable)
        }

        vm.pesticideStats.observe(viewLifecycleOwner) { stats ->
            binding.tvPesticideReceivable.text = CurrencyFormatter.format(stats.totalRemaining)
            binding.tvPesticideSales.text = "Sales: ${CurrencyFormatter.format(stats.totalSales)}"
        }

        vm.solarStats.observe(viewLifecycleOwner) { stats ->
            binding.tvSolarReceivable.text = CurrencyFormatter.format(stats.totalRemaining)
            binding.tvSolarSales.text = "Sales: ${CurrencyFormatter.format(stats.totalSales)}"
        }

        binding.cardPesticide.setOnClickListener {
            findNavController().navigate(R.id.action_home_to_category, bundleOf("category" to "pesticide"))
        }
        binding.cardSolar.setOnClickListener {
            findNavController().navigate(R.id.action_home_to_category, bundleOf("category" to "solar"))
        }
        binding.fab.setOnClickListener {
            findNavController().navigate(R.id.action_home_to_newEntry, bundleOf("category" to ""))
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
