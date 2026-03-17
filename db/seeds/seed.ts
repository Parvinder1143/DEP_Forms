import { supabase } from '@/lib/supabase'

async function seed() {
  console.log('🌱 Starting database seed...\n')

  try {
    // ============================================================================
    // SEED ROLES
    // ============================================================================
    console.log('📋 Seeding roles...')
    const { error: rolesError } = await supabase
      .from('roles')
      .insert([
        { name: 'Super Admin', description: 'Full system access', permissions: { 'all': true } },
        { name: 'Institute Admin', description: 'Institute-level administration', permissions: { 'manage_users': true, 'manage_forms': true } },
        { name: 'Department Head', description: 'Head of Department', permissions: { 'approve_department_requests': true } },
        { name: 'Section Head', description: 'Section Head', permissions: { 'approve_section_requests': true } },
        { name: 'Reporting Officer', description: 'Employee reporting officer', permissions: { 'recommend_forms': true } },
        { name: 'Hostel Warden', description: 'Hostel management', permissions: { 'manage_hostel': true } },
        { name: 'IT Admin', description: 'IT administration', permissions: { 'manage_emails': true } },
        { name: 'Security Officer', description: 'Security management', permissions: { 'issue_stickers': true } },
        { name: 'Student Affairs', description: 'Student affairs section', permissions: { 'approve_student_forms': true } },
        { name: 'Guest House Admin', description: 'Guest house management', permissions: { 'manage_reservations': true } }
      ])

    if (rolesError) throw rolesError
    console.log('✅ Roles seeded successfully\n')

    // ============================================================================
    // SEED DEPARTMENTS
    // ============================================================================
    console.log('📋 Seeding departments...')
    const { error: deptError } = await supabase
      .from('departments')
      .insert([
        { name: 'Computer Science & Engineering', code: 'CSE' },
        { name: 'Electrical Engineering', code: 'EE' },
        { name: 'Mechanical Engineering', code: 'ME' },
        { name: 'Chemistry', code: 'CHEM' },
        { name: 'Accounts & Finance', code: 'AF' },
        { name: 'Establishment', code: 'EST' },
        { name: 'IT Office', code: 'IT' },
        { name: 'Library', code: 'LIB' }
      ])

    if (deptError) throw deptError
    console.log('✅ Departments seeded successfully\n')

    // ============================================================================
    // SEED VEHICLE TYPES (already done in migration)
    // ============================================================================
    console.log('✅ Vehicle types already seeded in migration\n')

    // ============================================================================
    // SEED GUEST ROOM CATEGORIES (already done in migration)
    // ============================================================================
    console.log('✅ Room categories already seeded in migration\n')

    // ============================================================================
    // SEED BOOKING PURPOSES (already done in migration)
    // ============================================================================
    console.log('✅ Booking purposes already seeded in migration\n')

    // ============================================================================
    // SEED GUEST HOUSES
    // ============================================================================
    console.log('📋 Seeding guest houses...')
    const { data: guestHouses, error: ghError } = await supabase
      .from('guest_houses')
      .insert([
        {
          name: 'Executive Guest House',
          code: 'EGH',
          phone_number: '+91-1881-234567',
          email: 'eghouse@iitropar.ac.in',
          address: 'IIT Ropar Campus, Rupnagar',
          description: 'Premium guest accommodation facility',
          total_rooms: 10,
          active: true
        },
        {
          name: 'Business Guest House',
          code: 'BGH',
          phone_number: '+91-1881-234568',
          email: 'bhouse@iitropar.ac.in',
          address: 'IIT Ropar Campus, Rupnagar',
          description: 'Standard guest accommodation facility',
          total_rooms: 15,
          active: true
        }
      ])
      .select()

    if (ghError) throw ghError
    console.log('✅ Guest houses seeded successfully\n')

    // ============================================================================
    // SEED GUEST HOUSE ROOMS
    // ============================================================================
    if (guestHouses && guestHouses.length > 0) {
      console.log('📋 Seeding guest house rooms...')
      const rooms = []
      const categoryIds = ['EXEC_SUITE', 'BUS_ROOM', 'STD_ROOM']

      // Executive house rooms
      for (let i = 1; i <= 5; i++) {
        rooms.push({
          guest_house_id: guestHouses[0].id,
          room_number: `E-${i.toString().padStart(2, '0')}`,
          category_id: categoryIds[0], // EXEC_SUITE
          status: 'AVAILABLE',
          occupancy_capacity: 2,
          amenities: ['AC', 'WiFi', 'TV', 'Mini Bar', 'Bathroom']
        })
      }

      // Business house rooms
      for (let i = 1; i <= 8; i++) {
        rooms.push({
          guest_house_id: guestHouses[1].id,
          room_number: `B-${i.toString().padStart(2, '0')}`,
          category_id: categoryIds[1], // BUS_ROOM
          status: 'AVAILABLE',
          occupancy_capacity: 2,
          amenities: ['AC', 'WiFi', 'TV', 'Bathroom']
        })
      }

      const { error: roomError } = await supabase
        .from('guest_house_rooms')
        .insert(rooms)

      if (roomError) throw roomError
      console.log('✅ Guest house rooms seeded successfully\n')
    }

    // ============================================================================
    // SEED HOSTELS
    // ============================================================================
    console.log('📋 Seeding hostels...')
    const { data: hostels, error: hostelError } = await supabase
      .from('hostels')
      .insert([
        { name: 'Boys Hostel 1', code: 'BH1', category: 'Boys', total_rooms: 50 },
        { name: 'Girls Hostel 1', code: 'GH1', category: 'Girls', total_rooms: 40 },
        { name: 'Faculty Quarters', code: 'FQ1', category: 'Faculty', total_rooms: 30 }
      ])
      .select()

    if (hostelError) throw hostelError
    console.log('✅ Hostels seeded successfully\n')

    // ============================================================================
    // SEED HOSTEL ROOMS
    // ============================================================================
    if (hostels && hostels.length > 0) {
      console.log('📋 Seeding hostel rooms...')
      const hostelRooms = []

      // Boys Hostel 1 rooms
      for (let i = 101; i <= 110; i++) {
        hostelRooms.push({
          hostel_id: hostels[0].id,
          room_number: `${i}`,
          bed_capacity: 2,
          occupancy_type: 'Double',
          status: 'AVAILABLE'
        })
      }

      // Girls Hostel 1 rooms
      for (let i = 201; i <= 210; i++) {
        hostelRooms.push({
          hostel_id: hostels[1].id,
          room_number: `${i}`,
          bed_capacity: 2,
          occupancy_type: 'Double',
          status: 'AVAILABLE'
        })
      }

      // Faculty Quarters rooms
      for (let i = 301; i <= 305; i++) {
        hostelRooms.push({
          hostel_id: hostels[2].id,
          room_number: `${i}`,
          bed_capacity: 4,
          occupancy_type: 'Multi',
          status: 'AVAILABLE'
        })
      }

      const { error: roomError } = await supabase
        .from('hostel_rooms')
        .insert(hostelRooms)

      if (roomError) throw roomError
      console.log('✅ Hostel rooms seeded successfully\n')
    }

    console.log('✨ Database seed completed successfully!')
    console.log('\n📊 Summary:')
    console.log('  ✅ 10 roles created')
    console.log('  ✅ 8 departments created')
    console.log('  ✅ 2 guest houses created')
    console.log('  ✅ 13 guest house rooms created')
    console.log('  ✅ 3 hostels created')
    console.log('  ✅ 25 hostel rooms created')

  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()
