package com.kissanbhai.app.ui.entry

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.kissanbhai.app.databinding.FragmentNewEntryBinding
import com.kissanbhai.app.ui.common.ItemRowAdapter
import com.kissanbhai.app.util.CurrencyFormatter
import kotlinx.coroutines.launch

class NewEntryFragment : Fragment() {
    private var _binding: FragmentNewEntryBinding? = null
    private val binding get() = _binding!!
    private val vm: NewEntryViewModel by viewModels()
    private lateinit var itemAdapter: ItemRowAdapter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?) =
        FragmentNewEntryBinding.inflate(inflater, container, false).also { _binding = it }.root

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val presetCategory = arguments?.getString("category") ?: ""
        vm.init(presetCategory)

        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }

        // Category selector
        if (presetCategory.isNotEmpty()) {
            binding.categoryGroup.visibility = View.GONE
        }
        binding.btnPesticide.setOnClickListener { vm.selectCategory("pesticide") }
        binding.btnSolar.setOnClickListener { vm.selectCategory("solar") }
        vm.selectedCategory.observe(viewLifecycleOwner) { cat ->
            binding.btnPesticide.isSelected = cat == "pesticide"
            binding.btnSolar.isSelected = cat == "solar"
            binding.btnPesticide.alpha = if (cat == "pesticide") 1f else 0.5f
            binding.btnSolar.alpha = if (cat == "solar") 1f else 0.5f
        }

        // Customer autocomplete
        vm.allCustomers.observe(viewLifecycleOwner) {
            vm.filterCustomers(binding.etCustomer.text?.toString() ?: "")
        }
        vm.filteredCustomers.observe(viewLifecycleOwner) { customers ->
            val items = customers.map { it.name }.toMutableList()
            if (items.isNotEmpty()) items.add("➕ Add new customer")
            val adapter = ArrayAdapter(requireContext(), android.R.layout.simple_dropdown_item_1line, items)
            binding.etCustomer.setAdapter(adapter)
            binding.etCustomer.showDropDown()
        }
        binding.etCustomer.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) { vm.filterCustomers(s?.toString() ?: "") }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })
        binding.etCustomer.setOnItemClickListener { _, _, position, _ ->
            val customers = vm.filteredCustomers.value ?: emptyList()
            if (position < customers.size) {
                vm.selectCustomer(customers[position])
                binding.etCustomer.setText(customers[position].name)
            } else {
                // "Add new customer" selected
                val name = binding.etCustomer.text?.toString()?.trim() ?: ""
                if (name.isNotEmpty()) {
                    vm.createAndSelectCustomer(name) { customer ->
                        binding.etCustomer.setText(customer.name)
                        Toast.makeText(requireContext(), "Customer '${customer.name}' added", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        // Item rows
        itemAdapter = ItemRowAdapter { vm.recalculate(itemAdapter.currentItems()) }
        binding.recyclerItems.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerItems.adapter = itemAdapter
        itemAdapter.addEmptyRow()

        binding.btnAddItem.setOnClickListener { itemAdapter.addEmptyRow() }

        vm.totals.observe(viewLifecycleOwner) { (amount, paid, balance) ->
            binding.tvTotalAmount.text = "Total: ${CurrencyFormatter.format(amount)}"
            binding.tvTotalPaid.text = "Paid: ${CurrencyFormatter.format(paid)}"
            binding.tvBalance.text = "Remaining: ${CurrencyFormatter.format(balance)}"
            val color = if (balance > 0)
                requireContext().getColor(android.R.color.holo_red_dark)
            else requireContext().getColor(android.R.color.holo_green_dark)
            binding.tvBalance.setTextColor(color)
        }

        binding.btnSave.setOnClickListener {
            val description = binding.etDescription.text?.toString() ?: ""
            val items = itemAdapter.currentItems()
            lifecycleScope.launch {
                val result = vm.save(items, description)
                if (result.isSuccess) {
                    Toast.makeText(requireContext(), "Entry saved!", Toast.LENGTH_SHORT).show()
                    findNavController().navigateUp()
                } else {
                    Toast.makeText(requireContext(), result.exceptionOrNull()?.message ?: "Error saving", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
