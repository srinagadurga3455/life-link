import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';

export const colors = {
  primary: '#000000',
  secondary: '#666666',
  light: '#F5F5F5',
  white: '#FFFFFF',
  red: '#E74C3C',
  green: '#27AE60',
  border: '#DDDDDD',
};

export const Button = ({
  onPress,
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}) => {
  const variantStyle = variant === 'primary' ? styles.buttonPrimary : styles.buttonSecondary;
  const sizeStyle =
    size === 'lg' ? styles.buttonLarge : size === 'sm' ? styles.buttonSmall : styles.buttonMedium;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        variantStyle,
        sizeStyle,
        (disabled || loading) && styles.buttonDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && styles.buttonTextSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
};

export const Card = ({ children, style }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const Input = ({ placeholder, value, onChangeText, secureTextEntry, style }) => (
  <View style={[styles.input, style]}>
    <Text style={styles.input}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
