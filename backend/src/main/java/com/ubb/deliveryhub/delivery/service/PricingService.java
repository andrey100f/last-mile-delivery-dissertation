package com.ubb.deliveryhub.delivery.service;

import com.ubb.deliveryhub.delivery.domain.DeliveryType;
import com.ubb.deliveryhub.delivery.domain.MoneySnapshot;
import com.ubb.deliveryhub.delivery.domain.dto.PackageRequestDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * <p>Deterministic, side-effect-free pricing utility retained for reference and potential reuse.</p>
 * <p>Create-delivery currently persists a client-provided pricing snapshot directly.</p>
 *
 * <h2>MVP rules (dissertation / prototype)</h2>
 * <ul>
 *   <li><b>STANDARD</b> — transport charge grows with weight using simple tiers (RON).</li>
 *   <li><b>EXPRESS</b> — applies a rush surcharge on top of the STANDARD transport component.</li>
 *   <li><b>VAT</b> — fixed 19% applied to the computed transport amount.</li>
 * </ul>
 *
 * <p><b>Tiered STANDARD transport (weight kg → base before express/VAT):</b></p>
 * <pre>
 * w ≤ 2   → 12.00 RON
 * 2 &lt; w ≤ 15 → 12 + (w − 2) × 3
 * w &gt; 15 → 12 + 13×3 + (w − 15) × 4
 * </pre>
 *
 * <p><b>EXPRESS:</b> transportForExpress = standardTransport × 1.25 + 18.00 RON rush flat fee.</p>
 *
 * <p>Returned amounts use scale 4 where intermediate sums round HALF_UP at each step; totals remain reproducible.</p>
 */
@Service
public class PricingService {

    private static final BigDecimal TWO = new BigDecimal("2");
    private static final BigDecimal FIFTEEN = new BigDecimal("15");
    private static final BigDecimal VAT_RATE = new BigDecimal("0.19");
    private static final BigDecimal EXPRESS_TRANSPORT_MULTIPLIER = new BigDecimal("1.25");
    private static final BigDecimal EXPRESS_RUSH_FLAT = new BigDecimal("18.00");
    private static final String CURRENCY = "RON";

    public MoneySnapshot calculate(DeliveryType deliveryType, PackageRequestDto pkg) {
        BigDecimal weight = pkg.getWeightKg().setScale(4, RoundingMode.HALF_UP);
        BigDecimal transport = standardTransport(weight);
        if (deliveryType == DeliveryType.EXPRESS) {
            transport = transport.multiply(EXPRESS_TRANSPORT_MULTIPLIER).add(EXPRESS_RUSH_FLAT).setScale(4, RoundingMode.HALF_UP);
        }

        BigDecimal baseAmount = transport;
        BigDecimal feeAmount = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

        BigDecimal taxable = baseAmount.add(feeAmount);
        BigDecimal taxAmount = taxable.multiply(VAT_RATE).setScale(4, RoundingMode.HALF_UP);
        BigDecimal totalAmount = taxable.add(taxAmount).setScale(4, RoundingMode.HALF_UP);

        return new MoneySnapshot(baseAmount, feeAmount, taxAmount, totalAmount, CURRENCY);
    }

    static BigDecimal standardTransport(BigDecimal weightKg) {
        if (weightKg.compareTo(TWO) <= 0) {
            return new BigDecimal("12.0000");
        }
        if (weightKg.compareTo(FIFTEEN) <= 0) {
            BigDecimal overTwo = weightKg.subtract(TWO).multiply(new BigDecimal("3"));
            return new BigDecimal("12.0000").add(overTwo).setScale(4, RoundingMode.HALF_UP);
        }
        BigDecimal mid = new BigDecimal("12.0000")
            .add(new BigDecimal("13").multiply(new BigDecimal("3")));
        BigDecimal overFifteen = weightKg.subtract(FIFTEEN).multiply(new BigDecimal("4"));
        return mid.add(overFifteen).setScale(4, RoundingMode.HALF_UP);
    }
}
