# 🗺️ Sanity Studio Map Interface Guide

## Overview

Your Sanity Studio now includes a built-in map interface for selecting pin locations. This guide explains how to use it effectively.

## 🎯 How to Use the Map Interface

### 1. **Creating a New Pin**

1. Go to your Sanity Studio at `http://localhost:3000/admin`
2. Click **"Create new document"** and select **"Pin"**
3. Fill in the basic information:
   - **Title**: Name of the location
   - **Description**: Details about the place
   - **Status**: Set to "pending" for new submissions

### 2. **Selecting a Location**

The **Location** field provides multiple ways to set coordinates:

#### **Option A: Interactive Map (Recommended)**
1. Click on the **Location** field
2. A map interface will appear
3. **Click anywhere on the map** to place a marker
4. The coordinates will be automatically filled in
5. You can drag the marker to adjust the position

#### **Option B: Manual Coordinates**
1. Click on the **Location** field
2. Enter coordinates manually:
   - **Latitude**: Decimal degrees (e.g., 44.4268)
   - **Longitude**: Decimal degrees (e.g., 26.1025)

### 3. **Map Features**

The built-in map interface includes:
- **Interactive map** with OpenStreetMap tiles
- **Click-to-place** markers
- **Drag and drop** functionality
- **Zoom controls** for precise placement
- **Coordinate display** showing exact lat/lng values

## 📍 **Best Practices**

### **Location Selection**
- **Be precise**: Use zoom to get exact coordinates
- **Verify accuracy**: Check the displayed coordinates
- **Use landmarks**: Reference nearby buildings or streets

### **Coordinate Format**
- **Latitude**: -90 to +90 degrees
- **Longitude**: -180 to +180 degrees
- **Precision**: 6 decimal places recommended (≈1 meter accuracy)

### **Example Coordinates**
```
Bucharest, Romania: 44.4268, 26.1025
Paris, France: 48.8566, 2.3522
New York, USA: 40.7128, -74.0060
```

## 🔄 **Workflow**

### **For Content Editors**
1. **Create** new pin with title and description
2. **Select location** using the map interface
3. **Set status** to "pending" for moderation
4. **Save** the document

### **For Moderators**
1. **Review** pending pins in the Studio
2. **Verify** location accuracy on the map
3. **Change status** to "approved" or "rejected"
4. **Add notes** if needed in moderation notes field

## 🚀 **Advanced Features**

### **Status Management**
- **Pending**: Awaiting review
- **Approved**: Will appear on public map
- **Rejected**: Won't appear on map
- **Draft**: Work in progress

### **Additional Fields**
- **Submitted By**: Track who created the pin
- **Moderation Notes**: Internal comments for reviewers
- **Approved At/By**: Audit trail for approvals

## 🛠️ **Troubleshooting**

### **Map Not Loading**
- Check internet connection (requires OpenStreetMap tiles)
- Refresh the page
- Clear browser cache

### **Coordinates Not Saving**
- Ensure both latitude and longitude are entered
- Check for valid coordinate ranges
- Try clicking on the map instead of manual entry

### **Performance Issues**
- The map loads tiles on-demand
- First load may be slower
- Subsequent interactions should be smooth

## 📱 **Mobile Usage**

The map interface works on mobile devices:
- **Touch-friendly** controls
- **Responsive design** adapts to screen size
- **Pinch-to-zoom** functionality
- **Tap-to-place** markers

## 🔗 **Integration**

Once a pin is **approved**:
1. **Webhook triggers** automatically
2. **Data syncs** to D1 database
3. **Appears** on your public map
4. **Real-time updates** for users

## 📊 **Quality Assurance**

### **Before Approving**
- ✅ Verify location accuracy
- ✅ Check title and description
- ✅ Ensure appropriate content
- ✅ Confirm coordinates are valid

### **After Approval**
- ✅ Pin appears on public map
- ✅ Webhook syncs successfully
- ✅ Data is consistent across systems

---

## 🎉 **You're Ready!**

Your Sanity Studio now has a powerful map interface for managing pin locations. The built-in geopoint input provides an intuitive way to select locations while maintaining data accuracy and workflow efficiency.

**Next Steps:**
1. Visit `http://localhost:3000/admin`
2. Create a test pin
3. Try the map interface
4. Approve the pin to see it on your public map

Happy mapping! 🗺️✨ 