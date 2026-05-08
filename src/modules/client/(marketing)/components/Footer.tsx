"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

export default function Footer() {
  return (
    <motion.footer
      className="bg-secondary/30 border-t border-border"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-[110rem] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <a href="#" className="flex items-center space-x-2 text-primary">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-foreground">Dr. Godly</span>
            </a>
            <p className="mt-4 text-muted-foreground text-sm">The future of intelligent, seamless, and secure healthcare.</p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground">Product</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Features", "For Patients", "For Doctors", "Pricing"].map((item) => (
                <li key={item}>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground">Company</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["About Us", "Careers", "Press", "Contact"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {["Privacy Policy", "Terms of Service", "Compliance"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors">{item}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Dr. Godly. All rights reserved.
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
