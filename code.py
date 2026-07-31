# Let's fix the drop_cm calculation (the math formula had a unit mixup in my first manual python run, but true_moa_300m is correct)
# 1 MOA at 100m = 100 * tan(1/60 deg) = 2.908882 cm
# At 300m, 1 MOA = 3 * 2.908882 = 8.726646 cm
# 4.6 MOA at 300m = 4.6 * 8.726646 = 40.14257 cm
# 1 click at 300m = 0.75 cm
# Clicks = 40.14257 / 0.75 = 53.523 -> Rounds to 54 clicks

# What if it's Shooter's MOA (SMOA = 1 inch at 100 yards = 2.54 cm at 91.44m)?
# 1 SMOA at 100m = 2.777 cm. 
# Let's stick to True MOA as ballistic apps default to True MOA unless specified as SMOA.
# 54 clicks = 13 big units + 2 clicks.
print(54 / 4)
