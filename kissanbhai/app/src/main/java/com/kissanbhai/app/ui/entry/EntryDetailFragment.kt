package com.kissanbhai.app.ui.entry

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.kissanbhai.app.data.repository.TransactionRepository
import com.kissanbhai.app.databinding.FragmentEntryDetailBinding
import com.kissanbhai.app.util.CurrencyFormatter
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Locale

class EntryDetailFragment : Fragment() {
    private var _binding: FragmentEntryDetailBinding? = null
    private val binding get() = _binding!!
    private val repo = TransactionRepository()

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?) =
        FragmentEntryDetailBinding.inflate(inflater, container, false).also { _binding = it }.root

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        binding.toolbar.setNavigationOnClickListener { findNavController().navigateUp() }

        val txnId = arguments?.getString("transactionId") ?: return
        val sdf = SimpleDateFormat("dd MMM yyyy", Locale.getDefault())

        lifecycleScope.launch {
            val txn = repo.getTransactionById(txnId)
            if (txn == null) {
                Toast.makeText(requireContext(), "Entry not found", Toast.LENGTH_SHORT).show()
                findNavController().navigateUp()
                return@launch
            }

            binding.tvCustomer.text = txn.customerName
            binding.tvCategory.text = if (txn.category == "pesticide") "🌿 Pesticide" else "☀️ Solar"
            binding.tvDate.text = txn.date?.toDate()?.let { sdf.format(it) } ?: "—"

            if (txn.description.isNotBlank()) {
                binding.tvDescription.text = txn.description
                binding.tvDescription.visibility = View.VISIBLE
            } else {
                binding.tvDescription.visibility = View.GONE
            }

            val sb = StringBuilder()
            txn.items.forEachIndexed { i, item ->
                sb.append("${i + 1}. ${item.name}\n")
                sb.append("   Price: ${CurrencyFormatter.format(item.price)}   ")
                sb.append("Paid: ${CurrencyFormatter.format(item.paid)}   ")
                sb.append("Remaining: ${CurrencyFormatter.format(item.balance)}\n\n")
            }
            binding.tvItems.text = sb.toString().trim()

            binding.tvTotal.text = "Total: ${CurrencyFormatter.format(txn.totalAmount)}"
            binding.tvPaid.text = "Paid: ${CurrencyFormatter.format(txn.totalPaid)}"
            binding.tvBalance.text = "Remaining: ${CurrencyFormatter.format(txn.totalBalance)}"
            val balanceColor = if (txn.totalBalance > 0)
                requireContext().getColor(android.R.color.holo_red_dark)
            else requireContext().getColor(android.R.color.holo_green_dark)
            binding.tvBalance.setTextColor(balanceColor)

            binding.btnAddPayment.visibility = if (txn.totalBalance > 0) View.VISIBLE else View.GONE
            binding.btnAddPayment.setOnClickListener {
                val input = EditText(requireContext()).apply {
                    hint = "Amount received"
                    inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
                    setPadding(48, 24, 48, 24)
                }
                AlertDialog.Builder(requireContext())
                    .setTitle("Record Payment")
                    .setMessage("Outstanding: ${CurrencyFormatter.format(txn.totalBalance)}")
                    .setView(input)
                    .setPositiveButton("Save") { _, _ ->
                        val amount = input.text.toString().toDoubleOrNull()
                        if (amount == null || amount <= 0) {
                            Toast.makeText(requireContext(), "Invalid amount", Toast.LENGTH_SHORT).show()
                            return@setPositiveButton
                        }
                        lifecycleScope.launch {
                            repo.addPayment(txnId, amount)
                            Toast.makeText(requireContext(), "Payment of ${CurrencyFormatter.format(amount)} recorded", Toast.LENGTH_SHORT).show()
                            findNavController().navigateUp()
                        }
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            }
        }
    }

    override fun onDestroyView() { super.onDestroyView(); _binding = null }
}
